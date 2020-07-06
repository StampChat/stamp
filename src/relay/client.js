import axios from 'axios'
import { splitEvery } from 'ramda'
import messaging from './messaging_pb'
import stealth from './stealth_pb'
import addressmetadata from '../keyserver/addressmetadata_pb'
import wrapper from '../pop/wrapper_pb'
import pop from '../pop/index'
import { pingTimeout, relayReconnectInterval } from '../utils/constants'
import VCard from 'vcf'
import EventEmitter from 'events'
import { constructStealthEntry, constructReplyEntry, constructTextEntry, constructImageEntry, constructPayload, constructMessage } from './constructors'
import { entryToImage, arrayBufferToBase64 } from '../utils/image'
import { decrypt, decryptWithEphemPrivKey, decryptEphemeralKey, constructStampPrivKey, constructStealthPrivKey } from './crypto'
import { calcId } from '../wallet/helpers'
import assert from 'assert'

const WebSocket = window.require('ws')
const cashlib = require('bitcore-lib-cash')

export class RelayClient {
  constructor (url, wallet, electrumClient, { getPubKey, messageStore }) {
    this.url = url
    this.httpScheme = 'http'
    this.wsScheme = 'ws'
    this.events = new EventEmitter()
    this.wallet = wallet
    this.electrumClient = electrumClient
    this.getPubKey = getPubKey
    this.messageStore = messageStore
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

  async profilePaymentRequest (address) {
    const url = `${this.httpScheme}://${this.url}/profile/${address}`
    return pop.getPaymentRequest(url, 'put')
  }

  async getRelayData (address) {
    const url = `${this.httpScheme}://${this.url}/profile/${address}`
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    })
    const metadata = wrapper.AuthWrapper.deserializeBinary(response.data)

    // Get PubKey
    const pubKey = metadata.getPubKey()

    const payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

    // Find vCard
    function isVCard (entry) {
      return entry.getKind() === 'vcard'
    }
    const entryList = payload.getEntriesList()
    const rawCard = entryList.find(isVCard).getEntryData() // TODO: Cancel if not found
    const strCard = new TextDecoder().decode(rawCard)
    const vCard = new VCard().parse(strCard)

    const name = vCard.data.fn._data

    // const bio = vCard.data.note._data
    const bio = ''

    // Get avatar
    function isAvatar (entry) {
      return entry.getKind() === 'avatar'
    }
    const avatarEntry = entryList.find(isAvatar)
    const rawAvatar = avatarEntry.getEntryData()

    const value = avatarEntry.getHeadersList()[0].getValue()
    const avatarDataURL = 'data:' + value + ';base64,' + arrayBufferToBase64(rawAvatar)

    const profile = {
      name,
      bio,
      avatar: avatarDataURL,
      pubKey
    }
    const inbox = {
      acceptancePrice: 100 // TODO: Parse
    }
    const relayData = {
      profile,
      inbox
    }
    return relayData
  }

  setUpWebsocket (address) {
    const url = `${this.wsScheme}://${this.url}/ws/${address}`
    const opts = { headers: { Authorization: this.token } }
    const socket = new WebSocket(url, opts)

    socket.onmessage = event => {
      const buffer = event.data
      const timedMessageSet = messaging.TimedMessageSet.deserializeBinary(buffer)
      const messageList = timedMessageSet.getMessagesList()

      const serverTime = timedMessageSet.getServerTime()
      const receivedTime = Date.now()
      for (const index in messageList) {
        const message = messageList[index]
        this.receiveMessage({ serverTime, receivedTime, message }).catch(err => console.error(err))
      }
    }

    const disconnectHandler = () => {
      this.events.emit('disconnected')
      setTimeout(() => {
        this.setUpWebsocket(address, this.token)
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

  async getAcceptancePrice (address) {
    // Get fee
    let acceptancePrice
    try {
      const filters = await this.getFilter(address)
      const priceFilter = filters.getPriceFilter()
      acceptancePrice = priceFilter.getAcceptancePrice()
    } catch (err) {
      acceptancePrice = 'Unknown'
    }
    return acceptancePrice
  }

  async getRawPayload (address, digest) {
    const url = `${this.httpScheme}://${this.url}/payloads/${address}`

    const hexDigest = Array.prototype.map.call(digest, x => ('00' + x.toString(16)).slice(-2)).join('')
    const response = await axios({
      method: 'get',
      url,
      headers: {
        Authorization: this.token
      },
      params: {
        digest: hexDigest
      },
      responseType: 'arraybuffer'
    })
    return response.data
  }

  async getPayload (address, digest) {
    const rawPayload = await this.getRawPayload(address, digest)
    const payload = messaging.Payload.deserializeBinary(rawPayload)
    return payload
  }

  async deleteMessage (digest) {
    assert(typeof digest === 'string')

    try {
      const message = this.messageStore.getMessage(digest)
      assert(message, 'message not found?')

      // Send utxos to a change address
      const changeAddresses = Object.keys(this.wallet.changeAddresses)
      const changeAddress = changeAddresses[changeAddresses.length * Math.random() << 0]
      await this.wallet.forwardUTXOsToAddress({ utxos: message.outpoints, address: changeAddress })

      const url = `${this.httpScheme}://${this.url}/messages/${this.wallet.myAddressStr}`
      await axios({
        method: 'delete',
        url,
        headers: {
          Authorization: this.token
        },
        params: {
          digest
        }
      })
    } catch (err) {
      // TODO: Notify user of error
      console.error(err)
    }
  }

  async putProfile (address, metadata) {
    const rawProfile = metadata.serializeBinary()
    const url = `${this.httpScheme}://${this.url}/profile/${address}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        Authorization: this.token
      },
      data: rawProfile
    })
  }

  async getMessages (address, startTime, endTime) {
    const url = `${this.httpScheme}://${this.url}/messages/${address}`
    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        Authorization: this.token
      },
      params: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        start_time: startTime,
        // eslint-disable-next-line @typescript-eslint/camelcase
        end_time: endTime
      },
      responseType: 'arraybuffer'
    })

    if (response.status === 200) {
      const messagePage = messaging.MessagePage.deserializeBinary(response.data)
      return messagePage
    }
  }

  async messagePaymentRequest (address) {
    const url = `${this.httpScheme}://${this.url}/messages/${address}`
    return pop.getPaymentRequest(url, 'get')
  }

  async sendPayment (paymentUrl, payment) {
    // TODO: Relative vs absolute
    const url = `${this.httpScheme}://${this.url}${paymentUrl}`
    return pop.sendPayment(url, payment)
  }

  async pushMessages (address, messageSet) {
    const rawMetadata = messageSet.serializeBinary()
    const url = `${this.httpScheme}://${this.url}/messages/${address}`
    await axios({
      method: 'put',
      url: url,
      data: rawMetadata
    })
  }

  sendMessageImpl ({ address, items, stampAmount, errCount = 0 }) {
    const wallet = this.wallet
    const privKey = wallet.identityPrivKey
    const destPubKey = this.getPubKey(address)

    const usedIDs = []
    const outpoints = []
    const transactions = []
    // Construct payload
    const entries = items.map(
      item => {
        // TODO: internal type does not match protocol. Consistency is good.
        if (item.type === 'stealth') {
          const { paymentEntry, transactionBundle } = constructStealthEntry({ ...item, wallet: this.wallet, destPubKey })
          outpoints.push(...transactionBundle.map(({ transaction, vouts, usedIds }) => {
            transactions.push(transaction)
            usedIDs.push(...usedIds)
            return vouts.map(vout => ({
              type: 'stealth',
              txId: transaction.id,
              satoshis: transaction.outputs[vout].satoshis,
              outputIndex: vout
            }))
          }).flat(1)
          )
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
    const senderAddress = this.wallet.myAddressStr
    // Add localy
    const payloadDigestHex = payloadDigest.toString('hex')
    this.events.emit('messageSending', { address, senderAddress, index: payloadDigestHex, items, outpoints, transactions })

    // Construct message
    try {
      const { message, transactionBundle } = constructMessage(wallet, serializedPayload, privKey, destPubKey, stampAmount)
      outpoints.push(...transactionBundle.map(({ transaction, vouts, usedIds }) => {
        transactions.push(transaction)
        usedIDs.push(...usedIds)
        return vouts.map(vout => ({
          type: 'stamp',
          txId: transaction.id,
          satoshis: transaction.outputs[vout].satoshis,
          outputIndex: vout
        }))
      }).flat(1)
      )

      const messageSet = new messaging.MessageSet()
      messageSet.addMessages(message)
      const destAddr = destPubKey.toAddress('testnet').toLegacyAddress()
      const client = this.wallet.electrumClient
      Promise.all(transactions.map(transaction => {
        console.log('broadcasting txn')
        console.log(transaction)
        return client.request('blockchain.transaction.broadcast', transaction.toString())
      }))
        .then(() => this.pushMessages(destAddr, messageSet))
        .then(() => this.events.emit('messageSent', { address, senderAddress, index: payloadDigestHex, items, outpoints, transactions }))
        .catch(async (err) => {
          console.error(err)
          if (err.response) {
            console.error(err.response)
          }
          // Unfreeze UTXOs
          await Promise.all(usedIDs.map(id => wallet.fixFrozenUTXO(id)))
          errCount += 1
          console.log('error sending message', err)
          if (errCount >= 3) {
            console.log(`unable to send message after ${errCount} retries`)
            return
          }
          // TODO: Currently, we can lose stealth transaction data if the stamp inputs fail.
          // Also, retries messages are not deleted from the message output window.
          // Both of these issues need to be fixed.
          this.sendMessageImpl({ address, items, stampAmount, errCount })
        })
    } catch (err) {
      console.error(err)
      this.events.emit('messageSendError', { address, senderAddress, index: payloadDigestHex, items, outpoints, transactions })
    }
  }

  // Stub for original API
  // TODO: Fix clients to not use these APIs at all
  sendMessage ({ address, text, replyDigest, stampAmount }) {
    // Send locally
    const items = [
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
    this.sendMessageImpl({ address, items, stampAmount })
  }

  sendStealthPayment ({ address, stampAmount, amount, memo }) {
    // Send locally
    const items = [
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
    this.sendMessageImpl({ address, items, stampAmount })
  }

  sendImage ({ address, image, caption, replyDigest, stampAmount }) {
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

    this.sendMessageImpl({ address, items, stampAmount })
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
      const message = await this.messageStore.getMessage(payloadDigestHex)
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
      console.error('Payload received doesn\'t match digest. Refusing to process message', payloadDigest, payloadDigestFromServer)
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

    const scheme = payload.getScheme()
    let entriesRaw
    if (scheme === 0) {
      entriesRaw = payload.getEntries()
    } else if (scheme === 1) {
      const entriesCipherText = payload.getEntries()

      const ephemeralPubKeyRaw = payload.getEphemeralPubKey()
      const ephemeralPubKey = cashlib.PublicKey.fromBuffer(ephemeralPubKeyRaw)
      if (!outbound) {
        entriesRaw = decrypt(entriesCipherText, identityPrivKey, senderPubKey, ephemeralPubKey)
      } else {
        const ephemeralPrivKeyEncrypted = payload.getEphemeralPrivKey()
        const entriesDigest = cashlib.crypto.Hash.sha256(entriesCipherText)
        const ephemeralPrivKey = decryptEphemeralKey(ephemeralPrivKeyEncrypted, identityPrivKey, entriesDigest)
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
      const stampTxHDPrivKey = stampRootHDPrivKey.deriveChild(i)
      if (outbound) {
        for (const input of stampTx.inputs) {
          // In order to update UTXO state more quickly, go ahead and remove the inputs from our set immediately
          const utxoId = calcId({ txId: input.prevTxId.toString('hex'), outputIndex: input.outputIndex })
          wallet.removeUTXO(utxoId)
        }
      }
      for (const [j, outputIndex] of vouts.entries()) {
        const output = stampTx.outputs[outputIndex]
        const satoshis = output.satoshis
        const address = output.script.toAddress('testnet') // TODO: Make generic
        stampValue += satoshis

        // Also note, we should use an HD key here.
        const outputPrivKey = stampTxHDPrivKey
          .deriveChild(j)
          .privateKey

        // Network doesn't really matter here, just serves as a placeholder to avoid needing to compute the
        // HASH160(SHA256(point)) ourself
        // Also, ensure the point is compressed first before calculating the address so the hash is deterministic
        const computedAddress = new cashlib.PublicKey(cashlib.crypto.Point.pointToCompressed(outputPrivKey.toPublicKey().point)).toAddress('testnet')
        if (!outbound && !address.toBuffer().equals(computedAddress.toBuffer())) {
          // Assume outbound addresses were valid.  Otherwise we need to calclate a different
          // derivation then based on our identity address.
          console.error('invalid stamp address, ignoring')
          continue
        }

        const stampOutput = {
          address,
          privKey: outbound ? null : outputPrivKey, // This is okay, we don't add it to the wallet.
          satoshis,
          txId,
          outputIndex,
          type: 'stamp',
          payloadDigest
        }
        outpoints.push(stampOutput)
        if (outbound) {
          // In order to update UTXO state more quickly, go ahead and remove the inputs from our set immediately
          continue
        }
        wallet.addUTXO(stampOutput)
      }
    }

    // Ignore messages below acceptance price
    let stealthValue = 0

    // Decode entries
    const entries = messaging.Entries.deserializeBinary(entriesRaw)
    const entriesList = entries.getEntriesList()
    const newMsg = {
      outbound,
      status: 'confirmed',
      items: [],
      serverTime,
      receivedTime,
      outpoints,
      senderAddress: senderAddr
    }
    for (const index in entriesList) {
      const entry = entriesList[index]
      // If address data doesn't exist then add it
      const kind = entry.getKind()
      if (kind === 'reply') {
        const entryData = entry.getEntryData()
        const payloadDigest = Buffer.from(entryData).toString('hex')
        newMsg.items.push({
          type: 'reply',
          payloadDigest
        })
      } else if (kind === 'text-utf8') {
        const entryData = entry.getEntryData()
        const text = new TextDecoder().decode(entryData)
        newMsg.items.push({
          type: 'text',
          text
        })
      } else if (kind === 'stealth-payment') {
        const entryData = entry.getEntryData()
        const stealthMessage = stealth.StealthPaymentEntry.deserializeBinary(entryData)

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
            for (const input of stealthTx.inputs) {
              // Don't add these outputs to our wallet. They're the other persons
              const utxoId = calcId({ txId: input.prevTxId.toString('hex'), outputIndex: input.outputIndex })
              wallet.removeUTXO(utxoId)
            }
          }

          for (const [j, outputIndex] of vouts.entries()) {
            const output = stealthTx.outputs[outputIndex]
            const satoshis = output.satoshis

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
            if (!outbound && !address.toBuffer().equals(computedAddress.toBuffer())) {
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
            outpoints.push(stampOutput)
            if (outbound) {
              // Don't add these outputs to our wallet. They're the other persons
              continue
            }
            wallet.addUTXO(stampOutput)
          }
        }
        newMsg.items.push({
          type: 'stealth',
          amount: stealthValue
        })
      } else if (kind === 'image') {
        const image = entryToImage(entry)

        // TODO: Save to folder instead of in Vuex
        newMsg.items.push({
          type: 'image',
          image
        })
      }
    }

    const finalizedMessage = { outbound, copartyAddress, copartyPubKey, index: payloadDigestHex, newMsg: Object.freeze({ ...newMsg, stampValue, totalValue: stampValue + stealthValue }) }
    await this.messageStore.saveMessage(finalizedMessage)
    this.events.emit('receivedMessage', finalizedMessage)
  }

  async refresh () {
    const wallet = this.wallet
    const myAddressStr = wallet.myAddressStr
    const lastReceived = await this.messageStore.mostRecentMessageTime()
    console.log('refreshing', lastReceived, myAddressStr)
    const messagePage = await this.getMessages(myAddressStr, lastReceived || 0, null)
    const messageList = messagePage.getMessagesList()
    console.log('processing messages')
    const receivedTime = Date.now()
    const messageChunks = splitEvery(5, messageList)
    for (const messageChunk of messageChunks) {
      await new Promise((resolve) => {
        setTimeout(() => {
          for (const timedMessage of messageChunk) {
            // TODO: Check correct destination
            // const destPubKey = timedMessage.getDestination()
            const serverTime = timedMessage.getServerTime()
            const message = timedMessage.getMessage()
            // Here we are ensuring that their are yields between messages to the event loop.
            // Ideally, we move this to a webworker in the future.
            this.receiveMessage({ serverTime, receivedTime, message }).then(resolve).catch((err) => {
              console.error('Unable to deserialize message:', err)
              resolve()
            })
          }
        }, 0)
      })
    }

    // const t0 = performance.now()
    // await this.wallet.fixUTXOs().then(() => {
    //   const fixUTXOsTime = performance.now()
    //   console.log(`fixUTXOsTime UTXOs took ${fixUTXOsTime - t0} ms`)
    // })
  }
}

export default RelayClient
