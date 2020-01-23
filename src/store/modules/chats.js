import messages from '../../relay/messages_pb'
import stealth from '../../relay/stealth_pb'
import relayConstructors from '../../relay/constructors'
import crypto from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import Vue from 'vue'

const cashlib = require('bitcore-lib-cash')

export default {
  namespaced: true,
  state: {
    order: [],
    activeChatAddr: null,
    data: {},
    lastReceived: null
  },
  getters: {
    getChatOrder (state) {
      return state.order
    },
    getInputMessage: (state) => (addr) => {
      if (addr in state.data) {
        return state.data[addr].inputMessage
      } else {
        return ''
      }
    },
    getInputMessageActive (state) {
      if (state.activeChatAddr == null) {
        return ''
      } else {
        return state.data[state.activeChatAddr].inputMessage
      }
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessageBody: (state) => (addr) => {
      let nMessages = Object.keys(state.data[addr].messages).length
      if (nMessages !== 0) {
        let latestMessage = state.data[addr].messages[nMessages - 1]
        if (latestMessage.type === 'text') {
          return latestMessage.body
        } else if (latestMessage.type === 'stealth-payment') {
          return latestMessage.body.memo
        } else {
          return ''
        }
      } else {
        return ''
      }
    },
    getAllMessages: (state) => (addr) => {
      if (addr in state.data) {
        return state.data[addr].messages
      } else {
        return []
      }
    },
    getLastReceived (state) {
      return state.lastReceived
    },
    isChat: (state) => (addr) => {
      return (addr in state.data)
    }
  },
  mutations: {
    setInputMessage (state, { addr, text }) {
      if (addr in state.data) {
        state.data[addr].inputMessage = text
      }
    },
    setInputMessageActive (state, text) {
      if (state.activeChatAddr != null) {
        state.data[state.activeChatAddr].inputMessage = text
      }
    },
    switchChatActive (state, addr) {
      state.activeChatAddr = addr
    },
    sendMessage (state, { addr, text }) {
      let newMsg = {
        type: 'text',
        outbound: true,
        sent: false,
        body: text,
        timestamp: Math.floor(Date.now() / 1000)
      }
      state.data[addr].messages.push(newMsg)
    },
    sendStealthPayment (state, { addr, amount, memo }) {
      let newMsg = {
        type: 'stealth-payment',
        outbound: true,
        sent: false,
        body: {
          amount,
          memo
        },
        timestamp: Math.floor(Date.now() / 1000)
      }
      state.data[addr].messages.push(newMsg)
    },
    switchOrder (state, addr) {
      state.order.splice(state.order.indexOf(addr), 1)
      state.order.unshift(addr)
    },
    clearChat (state, addr) {
      if (addr in state.data) {
        state.data[addr].messages = []
      }
    },
    deleteChat (state, addr) {
      state.order = state.order.filter(function (value, index, arr) {
        return value !== addr
      })
      if (state.activeChatAddr === addr) {
        state.activeChatAddr = null
      }
      Vue.delete(state.data, addr)
    },
    receiveMessage (state, { addr, newMsg }) {
      // Add new message
      if (!(addr in state.data)) {
        Vue.set(state.data, addr, { messages: [newMsg], inputMessage: '' })
        state.order.unshift(addr)
      } else {
        state.data[addr].messages.push(newMsg)
      }
    },
    setLastReceived (state, lastReceived) {
      state.lastReceived = lastReceived
    },
    openChat (state, addr) {
      if (!(addr in state.data)) {
        Vue.set(state.data, addr, { messages: [], inputMessage: '' })
        state.order.unshift(addr)
      }
      state.activeChatAddr = addr
    }
  },
  actions: {
    shareContact ({ commit }, { targetAddr, contact, shareAddr }) {
      let text = 'Name: ' + contact.name + '\n' + 'Address: ' + shareAddr
      commit('setInputMessage', { addr: targetAddr, text })
      commit('switchChatActive', targetAddr)
    },
    setInputMessage ({ commit }, { addr, text }) {
      commit('setInputMessage', { addr, text })
    },
    setInputMessageActive ({ commit }, text) {
      commit('setInputMessageActive', text)
    },
    switchChatActive ({ commit }, addr) {
      commit('switchChatActive', addr)
    },
    startChatUpdater ({ dispatch }) {
      setInterval(() => { dispatch('refresh') }, 1_000)
    },
    async sendMessage ({ commit, rootGetters }, { addr, text }) {
      // Send locally
      commit('sendMessage', { addr, text })

      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let message = await relayConstructors.constructTextMessage(text, privKey, destPubKey, 1)
      let messageSet = new messages.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      await client.pushMessages(destAddr, messageSet)

      // TODO: Confirmation
    },
    async sendStealthPayment ({ commit, rootGetters }, { addr, amount, memo }) {
      // Send locally
      commit('sendStealthPayment', { addr, amount, memo })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let message = await relayConstructors.constructStealthPaymentMessage(amount, memo, privKey, destPubKey, 1)
      let messageSet = new messages.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      await client.pushMessages(destAddr, messageSet)
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
    async addMessage ({ commit, rootGetters, dispatch }, { message, timestamp }) {
      let rawSenderPubKey = message.getSenderPubKey()
      let senderPubKey = cashlib.PublicKey.fromBuffer(rawSenderPubKey)
      let senderAddr = senderPubKey.toAddress('testnet')
        .toCashAddress() // TODO: Make generic

      // Check whether contact exists
      if (!rootGetters['contacts/isContact'](senderAddr)) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', { addr: senderAddr, pubKey: senderPubKey }, { root: true })

        // Load contact
        dispatch('contacts/refresh', senderAddr, { root: true })
      }

      // Decode message
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
        entriesRaw = crypto.decrypt(entriesCipherText, privKey, senderPubKey, ephemeralPubKey)
      } else {
        // TODO: Raise error
      }

      // Add UTXO
      let payloadDigest = cashlib.crypto.Hash.sha256(rawPayload)
      let stampTxRaw = Buffer.from(message.getStampTx())
      let stampTx = cashlib.Transaction(stampTxRaw)
      let txId = stampTx.hash
      let output = stampTx.outputs[0]
      let satoshis = output.satoshis
      let address = output.script.toAddress('testnet').toLegacyAddress() // TODO: Make generic
      let changeOutput = {
        address,
        outputIndex: 0, // 0 is always stamp output
        satoshis,
        txId,
        type: 'stamp',
        payloadDigest
      }
      dispatch('wallet/addUTXO', changeOutput, { root: true })

      // Decode entries
      let entries = messages.Entries.deserializeBinary(entriesRaw)
      let entriesList = entries.getEntriesList()
      for (let index in entriesList) {
        let entry = entriesList[index]
        // If addr data doesn't exist then add it
        let newMsg
        let kind = entry.getKind()
        if (kind === 'text-utf8') {
          let entryData = entry.getEntryData()
          let text = new TextDecoder().decode(entryData)
          newMsg = { type: 'text', outbound: false, sent: true, body: text, timestamp }
        } else if (kind === 'stealth-payment') {
          let entryData = entry.getEntryData()
          let stealthMessage = stealth.StealthPaymentEntry.deserializeBinary(entryData)

          let memo = stealthMessage.getMemo()
          let txId = Buffer.from(stealthMessage.getTxId()).toString('hex')

          let electrumHandler = rootGetters['electrumHandler/getClient']
          await new Promise(resolve => setTimeout(resolve, 5000)) // TODO: This is hacky as fuck

          let txRaw = await electrumHandler.blockchainTransaction_get(txId)
          let tx = cashlib.Transaction(txRaw)

          // Add stealth output
          let output = tx.outputs[0]
          let ephemeralPrivKey = entryData.getEphemeralPrivKey()
          let stealthOutput = {
            address,
            outputIndex: 0, // 0 is always stamp output
            satoshis,
            txId,
            type: 'stealth',
            ephemeralPrivKey
          }
          dispatch('wallet/addUTXO', stealthOutput, { root: true })

          newMsg = {
            type: 'stealth-payment',
            outbound: false,
            sent: true,
            body: {
              amount: output.satoshis,
              memo
            },
            timestamp
          }
        }
        commit('receiveMessage', { addr: senderAddr, newMsg })
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
        await dispatch('addMessage', { timestamp, message })
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
