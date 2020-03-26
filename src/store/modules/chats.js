import messaging from '../../relay/messaging_pb'
import stealth from '../../relay/stealth_pb'
import { decrypt } from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import Vue from 'vue'
import imageUtil from '../../utils/image'
import { insuffientFundsNotify, chainTooLongNotify, desktopNotify } from '../../utils/notifications'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../utils/wallet'
import { constructStealthPaymentMessage, constructImageMessage, constructTextMessage } from '../../relay/constructors'
import RelayClient from '../../relay/client'

const cashlib = require('bitcore-lib-cash')

function calculateUnreadAggregates (state, addr) {
  const unreadAggregates = Object.entries(state.data[addr].messages)
    .filter(([timestamp]) => state.data[addr].lastRead < timestamp)
    .map(([timestamp, message]) => {
      return stampPrice(message.outpoints) || 0
    })
    .reduce(
      ({ totalUnreadValue, totalUnreadMessages }, curStampSats) => ({
        totalUnreadValue: totalUnreadValue + curStampSats,
        totalUnreadMessages: totalUnreadMessages + 1
      }),
      {
        totalUnreadValue: 0,
        totalUnreadMessages: 0
      }
    )
  return unreadAggregates
}

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
    getSortedChatOrder (state) {
      const sortedOrder = state.order.map(
        addr => ({
          address: addr,
          ...calculateUnreadAggregates(state, addr),
          lastRead: state.data[addr].lastRead
        })
      ).sort(({ totalUnreadValue: valueA, lastRead: lastReadA }, { totalUnreadValue: valueB, lastRead: lastReadB }) => {
        if (valueA === valueB) {
          return lastReadB - lastReadA
        }
        return valueB - valueA
      })
      return sortedOrder
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
    sendMessageLocal (state, { addr, index, items, outpoints }) {
      let timestamp = Date.now()
      let newMsg = {
        type: 'text',
        outbound: true,
        status: 'pending',
        items,
        timestamp,
        outpoints
      }

      Vue.set(state.data[addr].messages, index, newMsg)
    },
    setOutpoints (state, { addr, index, outpoints }) {
      state.data[addr].messages[index].outpoints = outpoints
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
      let contact = rootGetters['contacts/getContactProfile'](currentAddr)
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
      commit('sendMessageLocal', { addr, index, items, outpoints: null })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let stampAmount = getters['getStampAmount'](addr)
      try {
        var { message, outboxMessage, usedIDs, stampTx } = await constructTextMessage(text, privKey, destPubKey, 1, stampAmount)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'text', text } })
        return
      }
      let messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)

      // Construct self messages
      let myAddr = rootGetters['wallet/getMyAddressStr']
      let selfMessageSet = new messaging.MessageSet()
      selfMessageSet.addMessages(outboxMessage)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']

      try {
        // Send to outbox
        await client.pushMessages(myAddr, selfMessageSet)

        // Send to destination address
        await client.pushMessages(destAddr, messageSet)
        let outpoint = {
          stampTx,
          vouts: [0]
        }
        commit('setOutpoints', { addr, index, outpoints: [outpoint] })
        commit('setStatus', { addr, index, status: 'confirmed' })
      } catch (err) {
        console.error(err.response)
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
      commit('sendMessageLocal', { addr, index, items, outpoints: null })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let stampAmount = getters['getStampAmount'](addr)
      try {
        var { message, outboxMessage, usedIDs, stampTx } = await constructStealthPaymentMessage(amount, memo, privKey, destPubKey, 1, stampAmount, stamptxId)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'stealth', amount, memo, stampTxID: err.stampTxId } })
        return
      }
      let messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)
      messageSet.addMessages(outboxMessage)

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
      commit('sendMessageLocal', { addr, index, items, outpoints: null })

      // Construct message
      let privKey = rootGetters['wallet/getIdentityPrivKey']
      let destPubKey = rootGetters['contacts/getPubKey'](addr)
      let stampAmount = getters['getStampAmount'](addr)
      try {
        var { message, outboxMessage, usedIDs, stampTx } = await constructImageMessage(image, caption, privKey, destPubKey, 1, stampAmount)
      } catch (err) {
        console.error(err)

        insuffientFundsNotify()
        commit('setStatusError', { addr, index, retryData: { msgType: 'image', image, caption } })
        return
      }
      let messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)
      messageSet.addMessages(outboxMessage)

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
      const rawSenderPubKey = message.getSenderPubKey()
      const senderPubKey = cashlib.PublicKey.fromBuffer(rawSenderPubKey)
      const senderAddr = senderPubKey.toAddress('testnet')
        .toCashAddress() // TODO: Make generic
      const myAddress = rootGetters['wallet/getMyAddressStr']

      // Check whether contact exists
      if (!rootGetters['contacts/isContact'](senderAddr)) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', { addr: senderAddr, pubKey: senderPubKey }, { root: true })

        // Load contact
        dispatch('contacts/refresh', senderAddr, { root: true })
      }

      const rawPayload = message.getSerializedPayload()
      let payload

      // Get payload if serialized payload is missing
      if (rawPayload.length === 0) {
        const payloadDigest = message.getPayloadDigest()
        if (payloadDigest.length === 0) {
          // TODO: Handle
          return
        }
        const senderRelayUrl = rootGetters['contacts/getRelayURL'](senderAddr)
        const relayClient = new RelayClient(senderRelayUrl)
        try {
          payload = relayClient.getPayload(senderAddr, payloadDigest)
          console.log(payload)
        } catch (err) {
          console.error(err)
          // TODO: Handle
          return
        }
      } else {
        payload = messaging.Payload.deserializeBinary(rawPayload)
      }

      const desintationRaw = payload.getDestination()
      const destinationAddr = cashlib.PublicKey.fromBuffer(desintationRaw).toAddress()
      if (senderAddr === myAddress && myAddress === destinationAddr) {
        // TODO: Process self sends
        console.log('self send')
        return
      }

      let scheme = payload.getScheme()
      let entriesRaw
      if (scheme === 0) {
        entriesRaw = payload.getEntries()
      } else if (scheme === 1) {
        let entriesCipherText = payload.getEntries()

        let secretSeed = payload.getSecretSeed()
        let ephemeralPubKey = PublicKey.fromBuffer(secretSeed)
        let privKey = rootGetters['wallet/getIdentityPrivKey']
        entriesRaw = decrypt(entriesCipherText, privKey, senderPubKey, ephemeralPubKey)
      } else {
        // TODO: Raise error
      }

      // Add UTXO
      let payloadDigest = cashlib.crypto.Hash.sha256(rawPayload)
      let stampOutpoints = message.getStampOutpointsList()
      let outpoints = []
      for (let i in stampOutpoints) {
        let stampOutpoint = stampOutpoints[i]
        let stampTxRaw = Buffer.from(stampOutpoint.getStampTx())
        let stampTx = cashlib.Transaction(stampTxRaw)
        let txId = stampTx.hash
        let vouts = stampOutpoint.getVoutsList()
        outpoints.push({
          stampTx,
          vouts
        })
        for (let j in vouts) {
          let outputIndex = vouts[j]
          let output = stampTx.outputs[outputIndex]
          let satoshis = output.satoshis
          let address = output.script.toAddress('testnet').toLegacyAddress() // TODO: Make generic
          let stampOutput = {
            address,
            outputIndex,
            satoshis,
            txId,
            type: 'stamp',
            payloadDigest
          }
          dispatch('wallet/addUTXO', stampOutput, { root: true })
        }
      }

      // Decode entries
      let entries = messaging.Entries.deserializeBinary(entriesRaw)
      let entriesList = entries.getEntriesList()
      let outbound = (senderAddr === myAddress)
      let newMsg = {
        outbound,
        status: 'confirmed',
        items: [],
        timestamp,
        outpoints
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
          if (!document.hasFocus()) {
            let contact = rootGetters['contacts/getContact'](senderAddr)
            if (contact.notify) {
              desktopNotify(contact.keyserver.name, text, contact.keyserver.avatar, () => {
                dispatch('openChat', senderAddr)
              })
            }
          }
        } else if (kind === 'stealth-payment') {
          let entryData = entry.getEntryData()
          let stealthMessage = stealth.StealthPaymentEntry.deserializeBinary(entryData)

          let electrumHandler = rootGetters['electrumHandler/getClient']

          let txId = Buffer.from(stealthMessage.getTxId()).toString('hex')
          try {
            var txRaw = await electrumHandler.methods.blockchain_transaction_get(txId)
          } catch (err) {
            console.error(err)
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
      commit('receiveMessage', { addr: senderAddr, index, newMsg })
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

        let timestamp = timedMessage.getServerTime()
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
