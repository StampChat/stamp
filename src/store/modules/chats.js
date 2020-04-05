import messaging from '../../relay/messaging_pb'
import stealth from '../../relay/stealth_pb'
import { decrypt, decryptWithEphemPrivKey, decryptEphemeralKey, constructStampPrivKey, constructStealthPrivKey } from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import Vue from 'vue'
import imageUtil from '../../utils/image'
import { insuffientFundsNotify, chainTooLongNotify, desktopNotify } from '../../utils/notifications'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../utils/wallet'
import { constructStealthPaymentPayload, constructImagePayload, constructTextPayload, constructMessage, constructOutpointDigest } from '../../relay/constructors'

const cashlib = require('bitcore-lib-cash')

function calculateUnreadAggregates (state, addr) {
  const unreadMessages = Object.values(state.data[addr].messages)
    .filter((message) => state.data[addr].lastRead < message.receivedTime)
    .map((message) => {
      return stampPrice(message.outpoints) || 0
    })
  const totalUnreadValue = unreadMessages.reduce(
    (totalValue, curStampSats) => totalValue + curStampSats, 0
  )
  return {
    totalUnreadValue,
    totalUnreadMessages: unreadMessages.length
  }
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
    getCurrentReplyDigest: (state) => (addr) => {
      return state.data[addr].currentReply
    },
    getCurrentReply: (state) => (addr) => {
      let currentReply = state.data[addr].currentReply
      if (currentReply) {
        return state.data[addr].messages[currentReply]
      }
      return undefined
    },
    getMessage: (state) => (addr, index) => {
      return state.data[addr].messages[index]
    },
    containsMessage: (state) => (addr, index) => {
      if (addr in state.data) {
        return (index in state.data[addr].messages)
      }
      return false
    },
    getNumUnread: (state) => (addr) => {
      if (state.data[addr].lastRead === null) {
        return Object.keys(state.data[addr].messages).length
      }

      let values = Object.values(state.data[addr].messages)
      let lastUnreadIndex = values.findIndex(message => state.data[addr].lastRead === message.receivedTime)
      let numUnread = values.length - lastUnreadIndex - 1
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
    setCurrentReply (state, { addr, index }) {
      state.data[addr].currentReply = index
    },
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
      let values = Object.values(state.data[addr].messages)

      if (values.length === 0) {
        state.data[addr].lastRead = null
      } else {
        state.data[addr].lastRead = values[values.length - 1].receivedTime
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
    setCurrentReply ({ commit }, { addr, index }) {
      commit('setCurrentReply', { addr, index })
    },
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
    async sendMessage ({ commit, rootGetters, getters, dispatch }, { addr, text, replyDigest }) {
      // Send locally
      let items = [
        {
          type: 'text',
          text
        }
      ]

      if (replyDigest) {
        items.unshift({
          type: 'reply',
          payloadDigest: replyDigest
        })
      }

      const privKey = rootGetters['wallet/getIdentityPrivKey']
      const destPubKey = rootGetters['contacts/getPubKey'](addr)
      const stampAmount = getters['getStampAmount'](addr)

      // Construct payload
      const { payload, payloadDigest } = constructTextPayload(text, privKey, destPubKey, 1, replyDigest)

      // Add localy
      commit('sendMessageLocal', { addr, index: payloadDigest, items, outpoints: null })

      // Construct message
      try {
        var { message, usedIDs, stampTx } = await constructMessage(payload, privKey, destPubKey, stampAmount)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index: payloadDigest, retryData: { msgType: 'text', text } })
        return
      }
      let messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']

      try {
        // Send to destination address
        await client.pushMessages(destAddr, messageSet)
        let outpoint = {
          stampTx,
          vouts: [0]
        }
        commit('setOutpoints', { addr, index: payloadDigest, outpoints: [outpoint] })
        commit('setStatus', { addr, index: payloadDigest, status: 'confirmed' })
      } catch (err) {
        console.error(err.response)
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/fixFrozenUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index: payloadDigest, retryData: { msgType: 'text', text } })
      }
    },
    async sendStealthPayment ({ commit, rootGetters, getters, dispatch }, { addr, amount, memo, stamptxId, replyDigest }) {
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

      if (replyDigest) {
        items.unshift({
          type: 'reply',
          payloadDigest: replyDigest
        })
      }

      const privKey = rootGetters['wallet/getIdentityPrivKey']
      const destPubKey = rootGetters['contacts/getPubKey'](addr)
      const stampAmount = getters['getStampAmount'](addr)

      // Construct payload
      const { payload, payloadDigest } = await constructStealthPaymentPayload(amount, memo, privKey, destPubKey, 1, stamptxId, replyDigest)

      // Add localy
      commit('sendMessageLocal', { addr, index: payloadDigest, items, outpoints: null })

      try {
        var { message, usedIDs, stampTx } = await constructMessage(payload, privKey, destPubKey, stampAmount)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index: payloadDigest, retryData: { msgType: 'stealth', amount, memo, stamptxId } })
        return
      }
      let messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      try {
        await client.pushMessages(destAddr, messageSet)
        let outpoint = {
          stampTx,
          vouts: [0]
        }
        commit('setOutpoints', { addr, index: payloadDigest, outpoints: [outpoint] })
        commit('setStatus', { addr, index: payloadDigest, status: 'confirmed' })
      } catch (err) {
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/unfreezeUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index: payloadDigest, retryData: { msgType: 'stealth', amount, memo } })
      }
    },
    async sendImage ({ commit, rootGetters, getters, dispatch }, { addr, image, caption, replyDigest }) {
      // Send locally
      const items = [
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

      if (replyDigest) {
        items.unshift({
          type: 'reply',
          payloadDigest: replyDigest
        })
      }

      const privKey = rootGetters['wallet/getIdentityPrivKey']
      const destPubKey = rootGetters['contacts/getPubKey'](addr)
      const stampAmount = getters['getStampAmount'](addr)

      // Construct payload
      const { payload, payloadDigest } = constructImagePayload(image, caption, privKey, destPubKey, 1, replyDigest)

      // Add localy
      commit('sendMessageLocal', { addr, index: payloadDigest, items, outpoints: null })

      // Construct message
      try {
        var { message, usedIDs, stampTx } = await constructMessage(payload, privKey, destPubKey, stampAmount)
      } catch (err) {
        console.error(err)

        insuffientFundsNotify()
        commit('setStatusError', { addr, index: payloadDigest, retryData: { msgType: 'image', image, caption } })
        return
      }
      let messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)

      let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      let client = rootGetters['relayClient/getClient']
      try {
        await client.pushMessages(destAddr, messageSet)
        let outpoint = {
          stampTx,
          vouts: [0]
        }
        commit('setOutpoints', { addr, index: payloadDigest, outpoints: [outpoint] })
        commit('setStatus', { addr, index: payloadDigest, status: 'confirmed' })
      } catch (err) {
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/unfreezeUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index: payloadDigest, retryData: { msgType: 'image', image, caption } })
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
    async receiveMessage ({ commit, getters, rootGetters, dispatch }, { serverTime, receivedTime, message }) {
      const rawSenderPubKey = message.getSenderPubKey()
      const senderPubKey = cashlib.PublicKey.fromBuffer(rawSenderPubKey)
      const senderAddr = senderPubKey.toAddress('testnet').toCashAddress() // TODO: Make generic
      const myAddress = rootGetters['wallet/getMyAddressStr']
      const outbound = (senderAddr === myAddress)

      const rawPayload = message.getSerializedPayload()
      const payloadDigestFromServer = message.getPayloadDigest()
      let payload

      if (payloadDigestFromServer.length === 0 && rawPayload.length === 0) {
        // TODO: Handle
        console.error('Missing required fields')
        return
      }

      // Get payload if serialized payload is missing
      if (rawPayload.length === 0) {
        // Get relay client
        let relayClient = rootGetters['relayClient/getClient']
        try {
          let token = rootGetters['relayClient/getToken']
          payload = await relayClient.getPayload(senderAddr, token, payloadDigestFromServer)
        } catch (err) {
          console.error(err)
          // TODO: Handle
          return
        }
      } else {
        payload = messaging.Payload.deserializeBinary(rawPayload)
      }

      const payloadDigest = cashlib.crypto.Hash.sha256(rawPayload)
      if (!payloadDigest.equals(payloadDigestFromServer)) {
        console.error("Payload received doesn't match digest. Refusing to process message")
        return
      }

      const destinationRaw = payload.getDestination()
      const destPubKey = cashlib.PublicKey.fromBuffer(destinationRaw)
      const destinationAddr = destPubKey.toAddress('testnet').toCashAddress()
      const identityPrivKey = rootGetters['wallet/getIdentityPrivKey']

      // Check whether pre-existing
      if (outbound) {
        if (getters['containsMessage'](destinationAddr, payloadDigest)) {
          return
        }
      } else {
        if (getters['containsMessage'](senderAddr, payloadDigest)) {
          return
        }
      }

      if (outbound && myAddress === destinationAddr) {
        // TODO: Process self sends
        console.log('self send')
        return
      }

      // Check whether contact exists
      if (outbound) {
        if (!rootGetters['contacts/isContact'](destinationAddr)) {
          // Add dummy contact
          dispatch('contacts/addLoadingContact', { addr: destinationAddr, pubKey: destPubKey }, { root: true })

          // Load contact
          dispatch('contacts/refresh', destinationAddr, { root: true })
        }
      } else {
        if (!rootGetters['contacts/isContact'](senderAddr)) {
          // Add dummy contact
          dispatch('contacts/addLoadingContact', { addr: senderAddr, pubKey: senderPubKey }, { root: true })

          // Load contact
          dispatch('contacts/refresh', senderAddr, { root: true })
        }
      }

      let scheme = payload.getScheme()
      let entriesRaw
      if (scheme === 0) {
        entriesRaw = payload.getEntries()
      } else if (scheme === 1) {
        let entriesCipherText = payload.getEntries()

        let ephemeralPubKeyRaw = payload.getEphemeralPubKey()
        let ephemeralPubKey = PublicKey.fromBuffer(ephemeralPubKeyRaw)
        if (!outbound) {
          entriesRaw = decrypt(entriesCipherText, identityPrivKey, senderPubKey, ephemeralPubKey)
        } else {
          let ephemeralPrivKeyEncrypted = payload.getEphemeralPrivKey()
          let entriesDigest = cashlib.crypto.Hash.sha256(entriesCipherText)
          let ephemeralPrivKey = decryptEphemeralKey(ephemeralPrivKeyEncrypted, identityPrivKey, entriesDigest)
          entriesRaw = decryptWithEphemPrivKey(entriesCipherText, ephemeralPrivKey, identityPrivKey, destPubKey)
        }
      } else {
        // TODO: Raise error
      }

      // Add UTXO
      let stampOutpoints = message.getStampOutpointsList()
      let outpoints = []

      if (!outbound) {
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
            const outpointDigest = constructOutpointDigest(i, outputIndex, payloadDigest) // NOTE: This should be j, not vouts[j] otherwise we can't randomize the output order in the wallet.
            // Also note, we should use an HD key here.
            const privKey = constructStampPrivKey(outpointDigest, identityPrivKey)
            let stampOutput = {
              address,
              privKey,
              satoshis,
              txId,
              outputIndex,
              type: 'stamp',
              payloadDigest
            }
            dispatch('wallet/addUTXO', stampOutput, { root: true })
          }
        }
      }

      // Decode entries
      let entries = messaging.Entries.deserializeBinary(entriesRaw)
      let entriesList = entries.getEntriesList()
      let newMsg = {
        outbound,
        status: 'confirmed',
        items: [],
        serverTime,
        receivedTime,
        outpoints
      }
      for (let index in entriesList) {
        let entry = entriesList[index]
        // If addr data doesn't exist then add it
        let kind = entry.getKind()
        if (kind === 'reply') {
          let payloadDigest = Buffer.from(entry.getEntryData())
          newMsg.items.push({
            type: 'reply',
            payloadDigest
          })
        } else if (kind === 'text-utf8') {
          let entryData = entry.getEntryData()
          let text = new TextDecoder().decode(entryData)
          newMsg.items.push({
            type: 'text',
            text
          })

          // If not focused (and not outbox message) then notify
          if (!document.hasFocus() && !outbound) {
            let contact = rootGetters['contacts/getContact'](senderAddr)
            if (contact.notify) {
              desktopNotify(contact.profile.name, text, contact.profile.avatar, () => {
                dispatch('openChat', senderAddr)
              })
            }
          }
        } else if (kind === 'stealth-payment') {
          let entryData = entry.getEntryData()
          let stealthMessage = stealth.StealthPaymentEntry.deserializeBinary(entryData)

          // Add stealth outputs
          const outpointsList = stealthMessage.getOutpointsList()
          const ephemeralPubKeyRaw = stealthMessage.getEphemeralPubKey()
          const ephemeralPubKey = PublicKey.fromBuffer(ephemeralPubKeyRaw)
          let totalSatoshis = 0
          for (const [, outpoint] of Object.entries(outpointsList)) {
            const stealthTxRaw = Buffer.from(outpoint.getStealthTx())
            const stealthTx = cashlib.Transaction(stealthTxRaw)
            const txId = stealthTx.hash
            const vouts = outpoint.getVoutsList()
            for (const outputIndex of vouts) {
              const output = stealthTx.outputs[outputIndex]
              const satoshis = output.satoshis
              totalSatoshis += satoshis
              if (!outbound) {
                continue
                // We don't want to add these to the wallet, but we do want the total
              }
              const outputPrivKey = constructStealthPrivKey(ephemeralPubKey, identityPrivKey)
              const address = output.script.toAddress('testnet').toLegacyAddress() // TODO: Make generic
              const stampOutput = {
                address,
                satoshis,
                outputIndex,
                privKey: outputPrivKey,
                txId,
                type: 'stealth',
                payloadDigest
              }
              dispatch('wallet/addUTXO', stampOutput, { root: true })
            }
          }
          newMsg.items.push({
            type: 'stealth',
            amount: totalSatoshis
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

      if (outbound) {
        commit('receiveMessage', { addr: destinationAddr, index: payloadDigest, newMsg })
      } else {
        commit('receiveMessage', { addr: senderAddr, index: payloadDigest, newMsg })
      }
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
        try {
          let serverTime = timedMessage.getServerTime()
          let receivedTime = Date.now()
          let message = timedMessage.getMessage()
          await dispatch('receiveMessage', { serverTime, receivedTime, message })
          lastReceived = Math.max(lastReceived, receivedTime)
        } catch (err) {
          console.error('Unable to deserialize message for some reason', err)
        }
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
