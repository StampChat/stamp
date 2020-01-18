import messages from '../../relay/messages_pb'
import relayConstructors from '../../relay/constructors'
import crypto from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'

const cashlib = require('bitcore-lib-cash')

export default {
  namespaced: true,
  state: { order: [], activeChatAddr: null, data: {}, lastReceived: null },
  getters: {
    getChatOrder (state) {
      return state.order
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessageBody:
            (state) => (addr) => {
              let nMessages = Object.keys(state.data[addr].messages).length
              if (nMessages !== 0) {
                return state.data[addr].messages[nMessages - 1].body
              } else {
                return ''
              }
            },
    getAllMessages: (state) => (addr) => {
      return state.data[addr].messages
    },
    getLastReceived (state) {
      return state.lastReceived
    },
    isChat: (state) => (addr) => {
      return (addr in state.data)
    }
  },
  mutations: {
    switchChatActive (state, addr) {
      state.activeChatAddr = addr
    },
    sendMessage (state, { addr, text }) {
      let newMsg = {
        outbound: true,
        sent: false,
        body: text,
        timestamp: Math.floor(Date.now() / 1000)
      }
      state.data[addr].messages.push(newMsg)
    },
    switchOrder (state, addr) {
      state.order.splice(state.order.indexOf(addr), 1)
      state.order.unshift(addr)
    },
    clearChat (state, addr) {
      state.data[addr].messages = []
    },
    deleteChat (state, addr) {
      state.order = state.order.filter(function (value, index, arr) {
        return value !== addr
      })
      if (state.activeChatAddr === addr) {
        state.activeChatAddr = null
      }
      delete state.data[addr]
    },
    addChatPre (state, addr) {
      state.data[addr] = { messages: [] }
    },
    addChatPost (state, addr) {
      state.order.unshift(addr)
      state.activeChatAddr = addr
    },
    receiveMessage (state, { addr, text, timestamp }) {
      // If addr data doesn't exist then add it
      if (!(addr in state.data)) {
        state.data[addr] = { messages: [] }
        state.order.unshift(addr)
      }

      // Add new message
      let newMsg = { outbound: false, sent: true, body: text, timestamp }
      state.data[addr].messages.push(newMsg)
    },
    setLastReceived (state, lastReceived) {
      state.lastReceived = lastReceived
    },
    openChat (state, addr) {
      console.log(addr)
      console.log(state.data)
      if (!(addr in state.data)) {
        console.log('got here')
        state.data[addr] = { messages: [] }
        state.order.unshift(addr)
      }
      state.activeChatAddr = addr
    }
  },
  actions: {
    switchChatActive ({ commit }, addr) {
      commit('switchChatActive', addr)
    },
    startChatUpdater ({ commit, dispatch }) {
      setInterval(() => { dispatch('refresh') }, 1_000)
    },
    async sendMessage ({ commit, rootGetters }, { addr, text }) {
      // Send locally
      commit('sendMessage', { addr, text })

      // Peer's relay server
      let privKey = rootGetters['wallet/getIdentityPrivKey']

      let client = rootGetters['relayClient/getClient']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let message =
            relayConstructors.constructTextMessage(text, privKey, destPubKey, 1)
      let messageSet = new messages.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()

      await client.pushMessages(destAddr, messageSet)

      // TODO: Confirmation
    },
    switchOrder ({ commit }, addr) {
      commit('switchOrder', addr)
    },
    clearChat ({ commit }, addr) {
      commit('clearChat', addr)
    },
    deleteChat ({ commit }, addr) {
      commit('deleteChat', addr)
    },
    addMessage ({ commit, rootGetters, dispatch }, { message, timestamp }) {
      let rawSenderPubKey = message.getSenderPubKey()
      let senderPubKey = cashlib.PublicKey.fromBuffer(rawSenderPubKey)
      let addr = senderPubKey.toAddress('testnet')
        .toCashAddress() // TODO: Make generic

      // Check whether contact exists
      if (!rootGetters['contacts/isContact']) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', addr, { root: true })

        // Load contact
        dispatch('contacts/refresh', addr, { root: true })
      }

      let rawPayload = message.getSerializedPayload()

      let payload = messages.Payload.deserializeBinary(rawPayload)
      let scheme = payload.getScheme()
      let entriesRaw
      if (scheme === 0) {
        entriesRaw = payload.getEntries()
      } else if (scheme === 1) {
        let entriesCipherText = payload.getEntries()

        let secretSeed = payload.getSecretSeed()
        let ephemeralPubKey = PublicKey.fromBuffer(secretSeed)
        let privKey = rootGetters['wallet/getIdentityPrivKey']
        entriesRaw = crypto.decrypt(
          entriesCipherText, privKey, senderPubKey, ephemeralPubKey)
      } else {
        // TODO: Raise error
      }

      let entries = messages.Entries.deserializeBinary(entriesRaw)
      let entriesList = entries.getEntriesList()
      for (let index in entriesList) {
        let entry = entriesList[index]
        // TODO: Don't assume it's a text msg
        let text = new TextDecoder().decode(entry.getEntryData())
        commit('receiveMessage', { addr, text, timestamp })
      }
    },
    async refresh ({ commit, rootGetters, getters, dispatch }) {
      if (rootGetters['wallet/isSetupComplete'] === false) {
        return
      }
      let myAddressStr = rootGetters['wallet/getMyAddressStr']
      let client = rootGetters['relayClient/getClient']
      let lastReceived = getters['getLastReceived'] || 0

      // If token is null then purchase one
      let token = rootGetters['relayClient/getToken']

      let messagePage =
            await client.getMessages(myAddressStr, token, lastReceived, null)
      let messageList = messagePage.getMessagesList()

      for (let index in messageList) {
        let timedMessage = messageList[index]

        // TODO: Check correct destination
        // let destPubKey = timedMessage.getDestination()

        let timestamp = timedMessage.getTimestamp()
        let message = timedMessage.getMessage()
        dispatch('addMessage', { timestamp, message })
        lastReceived = Math.max(lastReceived, timestamp)
      }
      if (lastReceived) {
        commit('setLastReceived', lastReceived + 1)
      }
    },
    openChat ({ commit }, addr) {
      commit('openChat', addr)
    }
  }
}
