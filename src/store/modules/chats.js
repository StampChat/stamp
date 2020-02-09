import messages from '../../relay/messages_pb'
import stealth from '../../relay/stealth_pb'
import relayConstructors from '../../relay/constructors'
import crypto from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import Vue from 'vue'
import imageUtil from '../../utils/image'
import { insuffientFundsNotify, chainTooLongNotify } from '../../utils/notifications'
import { defaultStampAmount } from '../../utils/constants'

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
    getNumUnread: (state) => (addr) => {
      if (state.data[addr].lastRead === null) {
        return Object.keys(state.data[addr].messages).length
      }

      let ids = Object.keys(state.data[addr].messages)
      let lastUnreadIndex = ids.findIndex(id => state.data[addr].lastRead === id)
      let numUnread = ids.length - lastUnreadIndex - 1
      return numUnread
    },
    getLastRead: (state) => (addr) => {
      return state.data[addr].lastRead
    },
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
    getStampAmount: (state) => (addr) => {
      return state.data[addr].stampAmount
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessage: (state) => (addr) => {
      let nMessages = Object.keys(state.data[addr].messages).length
      if (nMessages === 0) {
        return null
      }

      let lastMessageKey = Object.keys(state.data[addr].messages)[nMessages - 1]
      let lastMessage = state.data[addr].messages[lastMessageKey]
      let items = lastMessage.items
      let lastItem = items[items.length - 1]

      if (lastItem.type === 'text') {
        let info = {
          outbound: lastMessage.outbound,
          text: lastItem.text
        }
        return info
      }

      if (lastItem.type === 'image') {
        let info = {
          outbound: lastMessage.outbound,
          text: 'Sent image'
        }
        return info
      }

      if (lastItem.type === 'stealth') {
        let info = {
          outbound: lastMessage.outbound,
          text: 'Sent Bitcoin'
        }
        return info
      }
    },
    getAllMessages: (state) => (addr) => {
      if (addr in state.data) {
        return state.data[addr].messages
      } else {
        return {}
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
    deleteMessage (state, { addr, id }) {
      Vue.delete(state.data[addr].messages, id)
    },
    reset (state) {
      state.order = []
      state.activeChatAddr = null
      state.data = {}
      state.lastReceived = null
    },
    readAll (state, addr) {
      let ids = Object.keys(state.data[addr].messages)

      if (ids.length === 0) {
        state.data[addr].lastRead = null
      } else {
        state.data[addr].lastRead = ids[ids.length - 1]
      }
    },
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
    sendMessageLocal (state, { addr, index, items, stampTx }) {
      let timestamp = Date.now()
      let newMsg = {
        type: 'text',
        outbound: true,
        status: 'pending',
        items,
        timestamp,
        stampTx
      }

      Vue.set(state.data[addr].messages, index, newMsg)
    },
    setStampTx (state, { addr, index, stampTx }) {
      state.data[addr].messages[index].stampTx = stampTx
    },
    setStatus (state, { index, addr, status }) {
      state.data[addr].messages[index].status = status
    },
    setStatusError (state, { index, addr, retryData }) {
      state.data[addr].messages[index].status = 'error'
      Vue.set(state.data[addr].messages[index], 'retryData', retryData)
    },
    switchOrder (state, addr) {
      state.order.splice(state.order.indexOf(addr), 1)
      state.order.unshift(addr)
    },
    clearChat (state, addr) {
      if (addr in state.data) {
        state.data[addr].messages = {}
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
    receiveMessage (state, { addr, index, newMsg }) {
      if (!(addr in state.data)) {
        let messages = {}
        // TODO: Better indexing
        messages[index] = newMsg

        Vue.set(state.data, addr, { messages, inputMessage: '', lastRead: null, stampAmount: defaultStampAmount })
        state.order.unshift(addr)
      } else {
        // TODO: Better indexing
        Vue.set(state.data[addr].messages, index, newMsg)
      }
    },
    setLastReceived (state, lastReceived) {
      state.lastReceived = lastReceived
    },
    openChat (state, addr) {
      if (!(addr in state.data)) {
        Vue.set(state.data, addr, { messages: {}, inputMessage: '', lastRead: null, stampAmount: defaultStampAmount })
        state.order.unshift(addr)
      }
      state.activeChatAddr = addr
    },
    setStampAmount (state, { addr, stampAmount }) {
      state.data[addr].stampAmount = stampAmount
    }
  },
  actions: {
    deleteMessage ({ commit }, { addr, id }) {
      commit('deleteMessage', { addr, id })
    },
    reset ({ commit }) {
      commit('reset')
    },
    readAll ({ commit }, addr) {
      commit('readAll', addr)
    },
    shareContact ({ commit, rootGetters }, { currentAddr, shareAddr }) {
      let contact = rootGetters['contacts/getContact'](currentAddr)
      let text = 'Name: ' + contact.name + '\n' + 'Address: ' + currentAddr
      commit('setInputMessage', { addr: shareAddr, text })
      commit('switchChatActive', shareAddr)
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
    async sendMessage ({ commit, rootGetters, getters, dispatch }, { addr, text }) {
      // Send locally
      let items = [
        {
          type: 'text',
          text
        }
      ]
      let index = Date.now() // TODO: Better indexing
      commit('sendMessageLocal', { addr, index, items, stampTx: null })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let stampAmount = getters['getStampAmount'](addr)
      try {
        var { message, usedIDs, stampTx } = await relayConstructors.constructTextMessage(text, privKey, destPubKey, 1, stampAmount)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'text', text } })
        return
      }
      let messageSet = new messages.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      try {
        await client.pushMessages(destAddr, messageSet)
        commit('setStampTx', { addr, index, stampTx })
        commit('setStatus', { addr, index, status: 'confirmed' })
      } catch (err) {
        console.err(err.response)
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/fixFrozenUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'text', text } })
      }
    },
    async sendStealthPayment ({ commit, rootGetters, getters, dispatch }, { addr, amount, memo, stamptxId }) {
      // Send locally
      let items = [
        {
          type: 'stealth',
          amount
        }
      ]
      if (memo !== '') {
        items.push(
          {
            type: 'text',
            text: memo
          })
      }
      let index = Date.now() // TODO: Better indexing
      commit('sendMessageLocal', { addr, index, items, stampTx: null })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let stampAmount = getters['getStampAmount'](addr)
      try {
        var { message, usedIDs, stampTx } = await relayConstructors.constructStealthPaymentMessage(amount, memo, privKey, destPubKey, 1, stampAmount, stamptxId)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'stealth', amount, memo, stampTxID: err.stampTxId } })
        return
      }
      let messageSet = new messages.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      try {
        await client.pushMessages(destAddr, messageSet)
        commit('setStampTx', { addr, index, stampTx })
        commit('setStatus', { addr, index, status: 'confirmed' })
      } catch (err) {
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/unfreezeUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'stealth', amount, memo } })
      }
    },
    async sendImage ({ commit, rootGetters, getters, dispatch }, { addr, image, caption }) {
      // Send locally
      let items = [
        {
          type: 'image',
          image
        }
      ]
      if (caption !== '') {
        items.push(
          {
            type: 'text',
            text: caption
          })
      }
      let index = Date.now() // TODO: Better indexing
      commit('sendMessageLocal', { addr, index, items, stampTx: null })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let stampAmount = getters['getStampAmount'](addr)
      try {
        var { message, usedIDs, stampTx } = await relayConstructors.constructImageMessage(image, caption, privKey, destPubKey, 1, stampAmount)
      } catch (err) {
        console.error(err)

        insuffientFundsNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'image', image, caption } })
        return
      }
      let messageSet = new messages.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      try {
        await client.pushMessages(destAddr, messageSet)
        commit('setStampTx', { addr, index, stampTx })
        commit('setStatus', { addr, index, status: 'confirmed' })
      } catch (err) {
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/unfreezeUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'image', image, caption } })
      }
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
    async receiveMessage ({ commit, rootGetters, dispatch }, { message, timestamp }) {
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
      let stampOutput = {
        address,
        outputIndex: 0, // 0 is always stamp output
        satoshis,
        txId,
        type: 'stamp',
        payloadDigest
      }
      dispatch('wallet/addUTXO', stampOutput, { root: true })

      // Decode entries
      let entries = messages.Entries.deserializeBinary(entriesRaw)
      let entriesList = entries.getEntriesList()
      let newMsg = {
        outbound: false,
        status: 'confirmed',
        items: [],
        timestamp,
        stampTx
      }
      for (let index in entriesList) {
        let entry = entriesList[index]
        // If addr data doesn't exist then add it
        let kind = entry.getKind()
        if (kind === 'text-utf8') {
          let entryData = entry.getEntryData()
          let text = new TextDecoder().decode(entryData)
          newMsg.items.push({
            type: 'text',
            text
          })
        } else if (kind === 'stealth-payment') {
          let entryData = entry.getEntryData()
          let stealthMessage = stealth.StealthPaymentEntry.deserializeBinary(entryData)

          let electrumHandler = rootGetters['electrumHandler/getClient']

          let txId = Buffer.from(stealthMessage.getTxId()).toString('hex')
          try {
            var txRaw = await electrumHandler.methods.blockchain_transaction_get(txId)
          } catch (err) {
            console.err(err)
            // TODO: Awaiting confirmation check
            // TODO: Logic relating to this
          }
          let tx = cashlib.Transaction(txRaw)

          // Add stealth output
          let output = tx.outputs[0]
          let address = output.script.toAddress('testnet').toLegacyAddress() // TODO: Make generic
          let ephemeralPubKey = stealthMessage.getEphemeralPubKey()
          let stealthOutput = {
            address,
            outputIndex: 0, // TODO: 0 is always stealth output, change this assumption?
            satoshis: output.satoshis,
            txId,
            type: 'stealth',
            ephemeralPubKey
          }
          dispatch('wallet/addUTXO', stealthOutput, { root: true })
          newMsg.items.push({
            type: 'stealth',
            amount: output.satoshis
          })
        } else if (kind === 'image') {
          let image = imageUtil.entryToImage(entry)

          // TODO: Save to folder instead of in Vuex
          newMsg.items.push({
            type: 'image',
            image
          })
        }
      }
      let index = Date.now()
      commit('receiveMessage', { addr: senderAddr, index, newMsg, stampTx })
    },
    async refresh ({ commit, rootGetters, getters, dispatch }) {
      let myAddressStr = rootGetters['wallet/getMyAddressStr']
      let client = rootGetters['relayClient/getClient']
      let lastReceived = getters['getLastReceived'] || 0

      // If token is null then purchase one
      let token = rootGetters['relayClient/getToken']

      let messagePage = await client.getMessages(myAddressStr, token, lastReceived, null)
      let messageList = messagePage.getMessagesList()

      for (let index in messageList) {
        let timedMessage = messageList[index]

        // TODO: Check correct destination
        // let destPubKey = timedMessage.getDestination()

        let timestamp = timedMessage.getTimestamp()
        let message = timedMessage.getMessage()
        await dispatch('receiveMessage', { timestamp, message })
        lastReceived = Math.max(lastReceived, timestamp)
      }
      if (lastReceived) {
        commit('setLastReceived', lastReceived + 1)
      }
    },
    openChat ({ commit }, addr) {
      commit('openChat', addr)
    },
    setStampAmount ({ commit }, { addr, stampAmount }) {
      commit('setStampAmount', { addr, stampAmount })
    }
  }
}
