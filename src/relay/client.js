import axios from 'axios'
import messaging from './messaging_pb'
import stealth from './stealth_pb'
import addressmetadata from '../keyserver/addressmetadata_pb'
import wrapper from '../pop/wrapper_pb'
import pop from '../pop/index'
import { pingTimeout, relayReconnectInterval } from '../utils/constants'
import VCard from 'vcf'
import EventEmitter from 'events'
import { constructStealthEntry, constructReplyEntry, constructTextEntry, constructImageEntry, constructPayload, constructMessage } from './constructors'
import imageUtil from '../utils/image'
import { decrypt, decryptWithEphemPrivKey, decryptEphemeralKey, constructStampPrivKey, constructStealthPrivKey } from './crypto'
import { calcId } from '../wallet/helpers'

const WebSocket = window.require('ws')
const cashlib = require('bitcore-lib-cash')

export class RelayClient {
  constructor (url, wallet, electrumClient, { getPubKey, getStoredMessage }) {
    this.url = url
    this.httpScheme = 'http'
    this.wsScheme = 'ws'
    this.events = new EventEmitter()
    this.wallet = wallet
    this.electrumClient = electrumClient
    this.getPubKey = getPubKey
    this.getStoredMessage = getStoredMessage
  }

  setToken (token) {
    this.token = token
  }

  setWallet (wallet) {
    this.wallet = wallet
  }

  setElectrumClient (electrumClient) {
    this.electrumClient = electrumClient
  }

  async profilePaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    return pop.getPaymentRequest(url, 'put')
  }

  async getRelayData (addr) {
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    let response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    })
    let metadata = wrapper.AuthWrapper.deserializeBinary(response.data)

    // Get PubKey
    let pubKey = metadata.getPubKey()

    let payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

    // Find vCard
    function isVCard (entry) {
      return entry.getKind() === 'vcard'
    }
    let entryList = payload.getEntriesList()
    let rawCard = entryList.find(isVCard).getEntryData() // TODO: Cancel if not found
    let strCard = new TextDecoder().decode(rawCard)
    let vCard = new VCard().parse(strCard)

    let name = vCard.data.fn._data

    // let bio = vCard.data.note._data
    let bio = ''

    // Get avatar
    function isAvatar (entry) {
      return entry.getKind() === 'avatar'
    }
    let avatarEntry = entryList.find(isAvatar)
    let rawAvatar = avatarEntry.getEntryData()

    // TODO: Use util function
    function _arrayBufferToBase64 (buffer) {
      var binary = ''
      var bytes = new Uint8Array(buffer)
      var len = bytes.byteLength
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return window.btoa(binary)
    }
    let value = avatarEntry.getHeadersList()[0].getValue()
    let avatarDataURL = 'data:' + value + ';base64,' + _arrayBufferToBase64(rawAvatar)

    let profile = {
      name,
      bio,
      avatar: avatarDataURL,
      pubKey
    }
    let inbox = {
      acceptancePrice: 100 // TODO: Parse
    }
    let relayData = {
      profile,
      inbox
    }
    return relayData
  }

  setUpWebsocket (addr) {
    let url = `${this.wsScheme}://${this.url}/ws/${addr}`
    let opts = { headers: { Authorization: this.token } }
    let socket = new WebSocket(url, opts)

    socket.onmessage = event => {
      let buffer = event.data
      let timedMessageSet = messaging.TimedMessageSet.deserializeBinary(buffer)
      let messageList = timedMessageSet.getMessagesList()

      let serverTime = timedMessageSet.getServerTime()
      let receivedTime = Date.now()
      for (let index in messageList) {
        let message = messageList[index]
        this.receiveMessage({ serverTime, receivedTime, message }).catch(err => console.error(err))
      }
    }

    const disconnectHandler = () => {
      this.events.emit('disconnected')
      setTimeout(() => {
        this.setUpWebsocket(addr, this.token)
      }, relayReconnectInterval)
    }

    socket.onerror = (err) => {
      this.events.emit('error', err)
    }
    socket.onclose = () => {
      disconnectHandler()
    }
    socket.onopen = () => {
      this.events.emit('opened')
    }

    // Setup ping timeout
    this.pingTimeout = setTimeout(() => {
      socket.terminate()
    }, pingTimeout)

    socket.on('ping', () => {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = setTimeout(() => {
        socket.terminate()
      }, pingTimeout)
    })
  }

  async getAcceptancePrice (addr) {
    // Get fee
    let acceptancePrice
    try {
      let filters = await this.getFilter(addr)
      let priceFilter = filters.getPriceFilter()
      acceptancePrice = priceFilter.getAcceptancePrice()
    } catch (err) {
      acceptancePrice = 'Unknown'
    }
    return acceptancePrice
  }

  async getRawPayload (addr, digest) {
    let url = `${this.httpScheme}://${this.url}/payloads/${addr}`

    let hexDigest = Array.prototype.map.call(digest, x => ('00' + x.toString(16)).slice(-2)).join('')
    let response = await axios({
      method: 'get',
      url,
      headers: {
        'Authorization': this.token
      },
      params: {
        digest: hexDigest
      },
      responseType: 'arraybuffer'
    })
    return response.data
  }

  async getPayload (addr, digest) {
    let rawPayload = this.getRawPayload(addr, digest)
    let payload = messaging.Payload.deserializeBinary(rawPayload)
    return payload
  }

  async deleteMessage (addr, digest) {
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    let hexDigest = Array.prototype.map.call(digest, x => ('00' + x.toString(16)).slice(-2)).join('')
    await axios({
      method: 'delete',
      url,
      headers: {
        'Authorization': this.token
      },
      params: {
        digest: hexDigest
      }
    })
  }

  async putProfile (addr, metadata) {
    let rawProfile = metadata.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        'Authorization': this.token
      },
      data: rawProfile
    })
  }

  async getMessages (addr, startTime, endTime) {
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    let response = await axios({
      method: 'get',
      url: url,
      headers: {
        'Authorization': this.token
      },
      params: {
        start_time: startTime,
        end_time: endTime
      },
      responseType: 'arraybuffer'
    })

    if (response.status === 200) {
      let messagePage = messaging.MessagePage.deserializeBinary(response.data)
      return messagePage
    }
  }

  async messagePaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    return pop.getPaymentRequest(url, 'get')
  }

  async sendPayment (paymentUrl, payment) {
    // TODO: Relative vs absolute
    let url = `${this.httpScheme}://${this.url}${paymentUrl}`
    return pop.sendPayment(url, payment)
  }

  async pushMessages (addr, messageSet) {
    let rawMetadata = messageSet.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    await axios({
      method: 'put',
      url: url,
      data: rawMetadata
    })
  }

  sendMessageImpl ({ addr, items, stampAmount }) {
    const wallet = this.wallet
    const privKey = wallet.identityPrivKey
    const destPubKey = this.getPubKey(addr)

    const usedIDs = []
    const outpoints = []
    const transactions = []
    // Construct payload
    const entries = items.map(
      item => {
        // TODO: internal type does not match protocol. Consistency is good.
        if (item.type === 'stealth') {
          const { paymentEntry, stealthTx, usedIDs: stealthIdsUsed, vouts } = constructStealthEntry({ ...item, wallet: this.wallet, destPubKey })
          outpoints.push(...vouts.map(vout => ({
            type: 'stealth',
            txId: stealthTx.id,
            satoshis: stealthTx.outputs[vout].satoshis,
            outputIndex: vout
          })))
          usedIDs.push(...stealthIdsUsed)
          transactions.push(stealthTx)
          return paymentEntry
        }
        // TODO: internal type does not match protocol. Consistency is good.
        if (item.type === 'text') {
          return constructTextEntry({ ...item })
        }
        if (item.type === 'reply') {
          return constructReplyEntry({ ...item })
        }
        if (item.type === 'image') {
          return constructImageEntry({ ...item })
        }
      }
    )
    const { serializedPayload, payloadDigest } = constructPayload(entries, privKey, destPubKey, 1)

    // Add localy
    const payloadDigestHex = payloadDigest.toString('hex')
    this.events.emit('messageSending', { addr, index: payloadDigestHex, items, outpoints })

    // Construct message
    try {
      var { message, usedIDs: usedStampIds, stampTx } = constructMessage(wallet, serializedPayload, privKey, destPubKey, stampAmount)
      // TODO: These need to come back from the constructMessage API
      // We could have more than one, and more than one transaction in the future (ideally)
      let outpoint = {
        type: 'stamp',
        txId: stampTx.id,
        vout: 0,
        satoshis: stampTx.outputs[0].satoshis
      }
      usedIDs.push(...usedStampIds)
      outpoints.push(outpoint)
    } catch (err) {
      console.error(err)
      this.events.emit('messageSendError', { addr, index: payloadDigestHex, items, outpoints })
      return
    }

    let messageSet = new messaging.MessageSet()
    messageSet.addMessages(message)
    let destAddr = destPubKey.toAddress('testnet').toLegacyAddress()

    const client = this.wallet.electrumClient
    Promise.all(transactions.map(transaction => {
      console.log('broadcasting txn')
      return client.request('blockchain.transaction.broadcast', transaction.toString())
    }))
      .then(() => this.pushMessages(destAddr, messageSet))
      .then(() => this.events.emit('messageSent', { addr, index: payloadDigestHex, items, outpoints }))
      .catch((err) => {
        console.error(err)
        if (err.response) {
          console.error(err.response)
        }
        // Unfreeze UTXOs
        // TODO: More subtle
        usedIDs.forEach(id => wallet.fixFrozenUTXO(id))

        this.events.emit('messageSendError', { addr, index: payloadDigestHex, items, err })
      })
  }

  // Stub for original API
  // TODO: Fix clients to not use these APIs at all
  sendMessage ({ addr, text, replyDigest, stampAmount }) {
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
    this.sendMessageImpl({ addr, items, stampAmount })
  }

  sendStealthPayment ({ addr, stampAmount, amount, memo }) {
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
    this.sendMessageImpl({ addr, items, stampAmount })
  }

  sendImage ({ addr, image, caption, replyDigest, stampAmount }) {
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

    this.sendMessageImpl({ addr, items, stampAmount })
  }

  async receiveMessage ({ serverTime, receivedTime, message }) {
    const rawSenderPubKey = message.getSenderPubKey()
    const senderPubKey = cashlib.PublicKey.fromBuffer(rawSenderPubKey)
    const senderAddr = senderPubKey.toAddress('testnet').toCashAddress() // TODO: Make generic
    const wallet = this.wallet
    const myAddress = wallet.myAddressStr
    const outbound = (senderAddr === myAddress)

    const rawPayloadFromServer = message.getSerializedPayload()
    const payloadDigestFromServer = message.getPayloadDigest()

    if (payloadDigestFromServer.length === 0 && rawPayloadFromServer.length === 0) {
      // TODO: Handle
      console.error('Missing required fields')
      return
    }

    // if this client sent the message, we already have the data and don't need to process it or get the payload again
    if (payloadDigestFromServer.length !== 0) {
      const payloadDigestHex = Array.prototype.map.call(payloadDigestFromServer, x => ('00' + x.toString(16)).slice(-2)).join('')
      const message = this.getStoredMessage(payloadDigestHex)
      if (message) {
        // TODO: We really should handle unfreezing UTXOs here via a callback in the future.
        return
      }
    }

    const getPayload = async (payloadDigest, messagePayload) => {
      if (messagePayload.length !== 0) {
        return messagePayload
      }
      try {
        return new Uint8Array(await this.getRawPayload(myAddress, payloadDigest))
      } catch (err) {
        console.error(err)
        // TODO: Handle
      }
    }

    // Get payload if serialized payload is missing
    const rawPayload = await getPayload(payloadDigestFromServer, rawPayloadFromServer)

    const payloadDigest = cashlib.crypto.Hash.sha256(rawPayload)
    if (!payloadDigest.equals(payloadDigestFromServer)) {
      console.error("Payload received doesn't match digest. Refusing to process message", payloadDigest, payloadDigestFromServer)
      return
    }

    const payload = messaging.Payload.deserializeBinary(rawPayload)
    const payloadDigestHex = payloadDigest.toString('hex')
    const destinationRaw = payload.getDestination()
    const destPubKey = cashlib.PublicKey.fromBuffer(destinationRaw)
    const destinationAddr = destPubKey.toAddress('testnet').toCashAddress()
    const identityPrivKey = wallet.identityPrivKey
    const copartyAddress = outbound ? destinationAddr : senderAddr
    const copartyPubKey = outbound ? destPubKey : senderPubKey

    if (outbound && myAddress === destinationAddr) {
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

      let ephemeralPubKeyRaw = payload.getEphemeralPubKey()
      let ephemeralPubKey = cashlib.PublicKey.fromBuffer(ephemeralPubKeyRaw)
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
      outpoints.push(...vouts.map(vout => ({
        txId,
        satoshis: stampTx.outputs[vout].satoshis,
        outputIndex: vout
      })))
      const stampTxHDPrivKey = stampRootHDPrivKey.deriveChild(i)

      if (outbound) {
        // We can remove UTXOs from our set here as we sent this message
        // this will make multiple devices more reliable, and also ensure importing
        // a wallet is faster as we won't need to fixup all the previously received utxos
        for (const input of stampTx.inputs) {
          const outputIndex = input.outputIndex
          const txId = input.prevTxId.toString('hex')
          const utxoId = calcId({ outputIndex, txId })
          wallet.removeUTXO(utxoId)
        }
      }

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
            const computedAddress = new cashlib.PublicKey(cashlib.crypto.Point.pointToCompressed(outputPrivKey.toPublicKey().point)).toAddress('testnet')
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
            wallet.addUTXO(stampOutput)
          } catch (err) {
            console.error(err)
          }
        }
      }
    }

    // Ignore messages below acceptance price
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
      } else if (kind === 'stealth-payment') {
        let entryData = entry.getEntryData()
        let stealthMessage = stealth.StealthPaymentEntry.deserializeBinary(entryData)

        // Add stealth outputs
        const outpointsList = stealthMessage.getOutpointsList()
        const ephemeralPubKeyRaw = stealthMessage.getEphemeralPubKey()
        const ephemeralPubKey = cashlib.PublicKey.fromBuffer(ephemeralPubKeyRaw)
        const stealthHDPrivKey = constructStealthPrivKey(ephemeralPubKey, identityPrivKey)
        for (const [i, outpoint] of outpointsList.entries()) {
          const stealthTxRaw = Buffer.from(outpoint.getStealthTx())
          const stealthTx = cashlib.Transaction(stealthTxRaw)
          const txId = stealthTx.hash
          const vouts = outpoint.getVoutsList()

          if (outbound) {
            // We can remove UTXOs from our set here as we sent this message
            // this will make multiple devices more reliable, and also ensure importing
            // a wallet is faster as we won't need to fixup all the previously received utxos
            for (const input of stealthTx.inputs) {
              const outputIndex = input.outputIndex
              const txId = input.prevTxId.toString('hex')
              const utxoId = calcId({ outputIndex, txId })
              wallet.removeUTXO(utxoId)
            }
          }

          outpoints.push(...vouts.map(vout => ({
            txId,
            satoshis: stealthTx.outputs[vout].satoshis,
            outputIndex: vout
          })))

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
            const computedAddress = new cashlib.PublicKey(cashlib.crypto.Point.pointToCompressed(outpointPrivKey.toPublicKey().point)).toAddress('testnet')
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
            wallet.addUTXO(stampOutput)
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

    this.events.emit('receivedMessage', { outbound, copartyAddress, copartyPubKey, index: payloadDigestHex, newMsg: Object.freeze({ ...newMsg, stampValue, totalValue: stampValue + stealthValue }) })
  }
  async refresh ({ lastReceived } = {}) {
    const wallet = this.wallet
    const myAddressStr = wallet.myAddressStr
    console.log('refreshing', lastReceived, myAddressStr)
    const messagePage = await this.getMessages(myAddressStr, lastReceived || 0, null)
    const messageList = messagePage.getMessagesList()
    console.log('processing messages')
    const receivedTime = Date.now()
    for (const index in messageList) {
      const timedMessage = messageList[index]

      // TODO: Check correct destination
      // const destPubKey = timedMessage.getDestination()
      try {
        const serverTime = timedMessage.getServerTime()
        const message = timedMessage.getMessage()
        await this.receiveMessage({ serverTime, receivedTime, message })
      } catch (err) {
        console.error('Unable to deserialize message for some reason', err)
      }
    }
  }
}

export default RelayClient
