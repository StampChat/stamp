import messaging from '../../relay/messaging_pb'
import stealth from '../../relay/stealth_pb'
import { decrypt, decryptWithEphemPrivKey, decryptEphemeralKey, constructStampPrivKey, constructStealthPrivKey } from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import Vue from 'vue'
import imageUtil from '../../utils/image'
import { insuffientFundsNotify, chainTooLongNotify, desktopNotify } from '../../utils/notifications'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../utils/wallet'
import { constructStealthPaymentPayload, constructImagePayload, constructTextPayload, constructMessage } from '../../relay/constructors'

const cashlib = require('bitcore-lib-cash')

const defaultContactObject = { inputMessage: '', lastRead: null, stampAmount: defaultStampAmount, totalUnreadMessages: 0, totalUnreadValue: 0, totalValue: 0 }

function calculateUnreadAggregates (messages, lastReadTime) {
  const messageValues = Object.values(messages)
    .filter(message => !message.outbound)
    .map((message) => {
      return {
        read: lastReadTime < message.receivedTime,
        totalValue: (stampPrice(message.outpoints) || 0) + message.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      }
    })
  const unreadMessageValues = messageValues.filter((message) => !message.read)
  const totalUnreadValue = unreadMessageValues.reduce((totalValue, message) => totalValue + message.totalValue, 0)
  const totalValue = messageValues.reduce((totalValue, message) => totalValue + message.totalValue, 0)
  return {
    totalUnreadValue,
    totalUnreadMessages: unreadMessageValues.length,
    totalValue
  }
}

export function rehydateChat (chats) {
  if (!chats) {
    return
  }

  if (chats.data) {
    for (const contactAddress in chats.data) {
      const contact = chats.data[contactAddress]
      contact.address = contactAddress
      if (contact.totalValue !== undefined) {
        // This person has saved data, no need to migrate
        continue
      }
      const { totalUnreadMessages, totalUnreadValue, totalValue } = calculateUnreadAggregates(contact.messages, contact.lastRead)
      contact.totalUnreadMessages = totalUnreadMessages
      contact.totalUnreadValue = totalUnreadValue
      contact.totalValue = totalValue
    }
  }
}

export default {
  namespaced: true,
  state: {
    activeChatAddr: null,
    data: {},
    lastReceived: null
  },
  getters: {
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
      return state.data[addr] ? state.data[addr].totalUnreadMessages : 0
    },
    getLastRead: (state) => (addr) => {
      return state.data[addr].lastRead
    },
    getSortedChatOrder (state) {
      const sortedOrder = Object.values(state.data).sort(
        (contactA, contactB) => {
          if (contactB.totalUnreadValue - contactA.totalUnreadValue !== 0) {
            return contactB.totalUnreadValue - contactA.totalUnreadValue
          }

          if (contactB.totalValue - contactA.totalValue !== 0) {
            return contactB.totalValue - contactA.totalValue
          }

          if (contactB.lastRead - contactA.lastRead !== 0) {
            return contactB.lastRead - contactA.lastRead
          }

          if (contactB.totalUnreadMessages - contactA.totalUnreadMessages !== 0) {
            return contactB.totalUnreadMessages - contactA.totalUnreadMessages
          }

          // No other tiebreakers
          return 0
        }
      )
      return sortedOrder
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
      let values = Object.values(state.data[addr].messages)

      if (values.length === 0) {
        state.data[addr].lastRead = null
      } else {
        state.data[addr].lastRead = values[values.length - 1].receivedTime
      }
      state.data[addr].totalUnreadMessages = 0
      state.data[addr].totalUnreadValue = 0
    },
    setActiveChat (state, addr) {
      if (!(addr in state.data)) {
        Vue.set(state.data, addr, { ...defaultContactObject, messsages: {}, address: addr })
      }
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
    clearChat (state, addr) {
      if (addr in state.data) {
        state.data[addr].messages = {}
      }
    },
    deleteChat (state, addr) {
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

        Vue.set(state.data, addr, { ...defaultContactObject, messages, address: addr })
      } else {
        // TODO: Better indexing
        Vue.set(state.data[addr].messages, index, newMsg)
      }

      state.data[addr].lastReceived = newMsg.receivedTime
      state.data[addr].totalUnreadMessages += 1
      const messageValue = stampPrice(newMsg.outpoints) + newMsg.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      state.data[addr].totalUnreadValue += messageValue
      state.data[addr].totalValue += messageValue
    },
    setLastReceived (state, lastReceived) {
      state.lastReceived = lastReceived
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
    shareContact ({ commit, rootGetters, dispatch }, { currentAddr, shareAddr }) {
      let contact = rootGetters['contacts/getContactProfile'](currentAddr)
      let text = 'Name: ' + contact.name + '\n' + 'Address: ' + currentAddr
      commit('setInputMessage', { addr: shareAddr, text })
      dispatch('setActiveChat', shareAddr)
    },
    setActiveChat ({ commit }, addr) {
      commit('setActiveChat', addr)
      commit('readAll', addr)
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
        var replyDigestBuffer = Buffer.from(replyDigest, 'hex')
      }

      const privKey = rootGetters['wallet/getIdentityPrivKey']
      const destPubKey = rootGetters['contacts/getPubKey'](addr)
      const stampAmount = getters['getStampAmount'](addr)

      // Construct payload
      const { payload, payloadDigest } = constructTextPayload(text, privKey, destPubKey, 1, replyDigestBuffer)

      // Add localy
      const payloadDigestHex = payloadDigest.toString('hex')
      commit('sendMessageLocal', { addr, index: payloadDigestHex, items, outpoints: null })

      // Construct message
      try {
        var { message, usedIDs, stampTx } = await constructMessage(payload, privKey, destPubKey, stampAmount)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index: payloadDigestHex, retryData: { msgType: 'text', text } })
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
        commit('setOutpoints', { addr, index: payloadDigestHex, outpoints: [outpoint] })
        commit('setStatus', { addr, index: payloadDigestHex, status: 'confirmed' })
      } catch (err) {
        console.error(err)
        if (err.response) {
          console.error(err.response)
        }
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/fixFrozenUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index: payloadDigestHex, retryData: { msgType: 'text', text } })
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
        var replyDigestBuffer = Buffer.from(replyDigest, 'hex')
      }

      const privKey = rootGetters['wallet/getIdentityPrivKey']
      const destPubKey = rootGetters['contacts/getPubKey'](addr)
      const stampAmount = getters['getStampAmount'](addr)

      // Construct payload
      const { payload, payloadDigest } = await constructStealthPaymentPayload(amount, memo, privKey, destPubKey, 1, stamptxId, replyDigestBuffer)

      // Add localy
      const payloadDigestHex = payloadDigest.toString('hex')
      commit('sendMessageLocal', { addr, index: payloadDigestHex, items, outpoints: null })

      try {
        var { message, usedIDs, stampTx } = await constructMessage(payload, privKey, destPubKey, stampAmount)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        commit('setStatusError', { addr, index: payloadDigestHex, retryData: { msgType: 'stealth', amount, memo, stamptxId } })
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
        commit('setOutpoints', { addr, index: payloadDigestHex, outpoints: [outpoint] })
        commit('setStatus', { addr, index: payloadDigestHex, status: 'confirmed' })
      } catch (err) {
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/unfreezeUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index: payloadDigestHex, retryData: { msgType: 'stealth', amount, memo } })
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
        var replyDigestBuffer = Buffer.from(replyDigest, 'hex')
      }

      const privKey = rootGetters['wallet/getIdentityPrivKey']
      const destPubKey = rootGetters['contacts/getPubKey'](addr)
      const stampAmount = getters['getStampAmount'](addr)

      // Construct payload
      const { payload, payloadDigest } = constructImagePayload(image, caption, privKey, destPubKey, 1, replyDigestBuffer)

      // Add localy
      const payloadDigestHex = payloadDigest.toString('hex')
      commit('sendMessageLocal', { addr, index: payloadDigestHex, items, outpoints: null })

      // Construct message
      try {
        var { message, usedIDs, stampTx } = await constructMessage(payload, privKey, destPubKey, stampAmount)
      } catch (err) {
        console.error(err)

        insuffientFundsNotify()
        commit('setStatusError', { addr, index: payloadDigestHex, retryData: { msgType: 'image', image, caption } })
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
        commit('setOutpoints', { addr, index: payloadDigestHex, outpoints: [outpoint] })
        commit('setStatus', { addr, index: payloadDigestHex, status: 'confirmed' })
      } catch (err) {
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => dispatch('wallet/unfreezeUTXO', id, { root: true }))

        chainTooLongNotify()
        commit('setStatusError', { addr, index: payloadDigestHex, retryData: { msgType: 'image', image, caption } })
      }
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

      const rawPayloadFromServer = message.getSerializedPayload()
      const payloadDigestFromServer = message.getPayloadDigest()

      if (payloadDigestFromServer.length === 0 && rawPayloadFromServer.length === 0) {
        // TODO: Handle
        console.error('Missing required fields')
        return
      }

      // Get payload if serialized payload is missing
      let rawPayload
      if (rawPayloadFromServer.length === 0) {
        // Get relay client
        let relayClient = rootGetters['relayClient/getClient']
        try {
          let token = rootGetters['relayClient/getToken']
          rawPayload = new Uint8Array(await relayClient.getRawPayload(myAddress, token, payloadDigestFromServer))
        } catch (err) {
          console.error(err)
          // TODO: Handle
          return
        }
      } else {
        rawPayload = rawPayloadFromServer
      }

      const payloadDigest = cashlib.crypto.Hash.sha256(rawPayload)
      if (!payloadDigest.equals(payloadDigestFromServer)) {
        console.error("Payload received doesn't match digest. Refusing to process message")
        return
      }

      const payload = messaging.Payload.deserializeBinary(rawPayload)
      const destinationRaw = payload.getDestination()
      const destPubKey = cashlib.PublicKey.fromBuffer(destinationRaw)
      const destinationAddr = destPubKey.toAddress('testnet').toCashAddress()
      const identityPrivKey = rootGetters['wallet/getIdentityPrivKey']

      const recipientAddress = outbound ? destinationAddr : senderAddr
      const recipientPubKey = outbound ? destPubKey : senderPubKey

      // Check whether pre-existing
      const payloadDigestHex = payloadDigest.toString('hex')
      if (getters['containsMessage'](recipientAddress, payloadDigestHex)) {
        return
      }

      if (outbound && myAddress === destinationAddr) {
        // TODO: Process self sends
        console.log('self send')
        return
      }

      // Check whether contact exists
      if (!rootGetters['contacts/isContact'](recipientAddress)) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', { addr: recipientAddress, pubKey: recipientPubKey }, { root: true })

        // Load contact
        dispatch('contacts/refresh', recipientAddress, { root: true })
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
      const stampOutpoints = message.getStampOutpointsList()
      const outpoints = []

      let stampValue = 0

      const stampRootHDPrivKey = constructStampPrivKey(payloadDigest, identityPrivKey)
        .deriveChild(44)
        .deriveChild(145)

      for (const [i, stampOutpoint] of stampOutpoints.entries()) {
        const stampTxRaw = Buffer.from(stampOutpoint.getStampTx())
        const stampTx = cashlib.Transaction(stampTxRaw)
        const txId = stampTx.hash
        const vouts = stampOutpoint.getVoutsList()
        outpoints.push({
          stampTx,
          vouts
        })
        const stampTxHDPrivKey = stampRootHDPrivKey.deriveChild(i)

        for (const [j, outputIndex] of vouts.entries()) {
          const output = stampTx.outputs[outputIndex]
          const satoshis = output.satoshis
          const address = output.script.toAddress('testnet') // TODO: Make generic
          stampValue += satoshis
          if (!outbound) {
            // Also note, we should use an HD key here.
            try {
              const outputPrivKey = stampTxHDPrivKey
                .deriveChild(j)
                .privateKey

              // Network doesn't really matter here, just serves as a placeholder to avoid needing to compute the
              // HASH160(SHA256(point)) ourself
              // Also, ensure the point is compressed first before calculating the address so the hash is deterministic
              const computedAddress = new PublicKey(cashlib.crypto.Point.pointToCompressed(outputPrivKey.toPublicKey().point)).toAddress('testnet')
              if (!address.toBuffer().equals(computedAddress.toBuffer())) {
                console.error('invalid stamp address, ignoring')
                continue
              }
              const stampOutput = {
                address,
                privKey: outputPrivKey,
                satoshis,
                txId,
                outputIndex,
                type: 'stamp',
                payloadDigest
              }
              dispatch('wallet/addUTXO', stampOutput, { root: true })
            } catch (err) {
              console.error(err)
            }
          }
        }
      }

      // Ignore messages below acceptance price
      const acceptancePrice = rootGetters['myProfile/getInbox'].acceptancePrice
      if (stampValue < acceptancePrice) {
        console.log('ignoring', stampValue, acceptancePrice)
        return
      }
      console.log('accepted')
      let stealthValue = 0

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
          const entryData = entry.getEntryData()
          let payloadDigest = Buffer.from(entryData).toString('hex')
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
                dispatch('setActiveChat', senderAddr)
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
          const stealthHDPrivKey = constructStealthPrivKey(ephemeralPubKey, identityPrivKey)
          for (const [i, outpoint] of outpointsList.entries()) {
            const stealthTxRaw = Buffer.from(outpoint.getStealthTx())
            const stealthTx = cashlib.Transaction(stealthTxRaw)
            const txId = stealthTx.hash
            const vouts = outpoint.getVoutsList()
            for (const [j, outputIndex] of vouts.entries()) {
              const output = stealthTx.outputs[outputIndex]
              const satoshis = output.satoshis

              if (outbound) {
                // We don't want to add these to the wallet, but we do want the total
                // We also can't compute the private key.... So the below address check would
                // error

                // Assume our output was correct and add to the total
                stealthValue += satoshis
                continue
              }
              const outpointPrivKey = stealthHDPrivKey
                .deriveChild(44)
                .deriveChild(145)
                .deriveChild(i)
                .deriveChild(j)
                .privateKey
              const address = output.script.toAddress('testnet') // TODO: Make generic
              // Network doesn't really matter here, just serves as a placeholder to avoid needing to compute the
              // HASH160(SHA256(point)) ourself
              // Also, ensure the point is compressed first before calculating the address so the hash is deterministic
              const computedAddress = new PublicKey(cashlib.crypto.Point.pointToCompressed(outpointPrivKey.toPublicKey().point)).toAddress('testnet')
              if (!address.toBuffer().equals(computedAddress.toBuffer())) {
                console.error('invalid stealth address, ignoring')
                continue
              }
              // total up the satoshis only if we know the txn was valid
              stealthValue += satoshis

              const stampOutput = {
                address,
                satoshis,
                outputIndex,
                privKey: outpointPrivKey,
                txId,
                type: 'stealth',
                payloadDigest
              }
              dispatch('wallet/addUTXO', stampOutput, { root: true })
            }
          }
          newMsg.items.push({
            type: 'stealth',
            amount: stealthValue
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
      commit('receiveMessage', { addr: recipientAddress, index: payloadDigestHex, newMsg: Object.freeze({ ...newMsg, stampValue, totalValue: stampValue + stealthValue }) })
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
    setStampAmount ({ commit }, { addr, stampAmount }) {
      commit('setStampAmount', { addr, stampAmount })
    }
  }
}
