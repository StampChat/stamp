import messages from './messages_pb'
import stealth from './stealth_pb'
import filters from './filters_pb'
import crypto from './crypto'
import store from '../store/index'

const cashlib = require('bitcore-lib-cash')

export default {
  async constructStampTransaction (payloadDigest, destPubKey, amount) {
    // Stamp output
    let stampAddress = crypto.constructStampPubKey(payloadDigest, destPubKey).toAddress('testnet')
    let stampOutput = new cashlib.Transaction.Output({
      script: cashlib.Script(new cashlib.Address(stampAddress)),
      satoshis: amount
    })

    let stampTx = await store.dispatch('wallet/constructTransaction', [stampOutput])
    return stampTx
  },
  async constructStealthTransaction (ephemeralPrivKey, destPubKey, amount) {
    // Add ephemeral output
    let stealthAddress = crypto.constructStealthPubKey(ephemeralPrivKey, destPubKey).toAddress('testnet')
    let stampOutput = new cashlib.Transaction.Output({
      script: cashlib.Script(new cashlib.Address(stealthAddress)),
      satoshis: amount
    })

    let stampTx = await store.dispatch('wallet/constructTransaction', [stampOutput])
    return stampTx
  },
  async constructMessage (payload, privKey, destPubKey) {
    let serializedPayload = payload.serializeBinary()
    let payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
    let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf: payloadDigest })
    ecdsa.sign()

    let message = new messages.Message()
    let sig = ecdsa.sig.toCompact(1).slice(1)
    let rawPubkey = privKey.toPublicKey().toBuffer()
    message.setSenderPubKey(rawPubkey)
    message.setSignature(sig)
    message.setSerializedPayload(serializedPayload)

    let amount = 300
    let stampTx = await this.constructStampTransaction(payloadDigest, destPubKey, amount)
    let rawStampTx = stampTx.toBuffer()
    message.setStampTx(rawStampTx)

    return message
  },
  constructPayload (entries, privKey, destPubKey, scheme) {
    let payload = new messages.Payload()
    payload.setTimestamp(Math.floor(Date.now() / 1000))
    let rawDestPubKey = destPubKey.toBuffer()
    payload.setDestination(rawDestPubKey)

    // Serialize and encrypt
    let rawEntries = entries.serializeBinary()
    if (scheme === 0) {
      payload.setEntries(rawEntries)
    } else if (scheme === 1) {
      let { cipherText, ephemeralPubKey } = crypto.encrypt(rawEntries, privKey, destPubKey)
      let ephemeralPubKeyRaw = ephemeralPubKey.toBuffer()

      payload.setEntries(cipherText)
      payload.setSecretSeed(ephemeralPubKeyRaw)
      payload.setScheme(messages.Payload.EncryptionScheme.EPHEMERALDH)
    } else {
      // TODO: Raise error
      return
    }
    return payload
  },
  async constructStealthPaymentMessage (amount, memo, privKey, destPubKey, scheme) {
    // Construct payment entry
    let paymentEntry = new messages.Entry()
    paymentEntry.setKind('stealth-payment')

    let stealthPaymentEntry = new stealth.StealthPaymentEntry()
    let ephemeralPrivKey = cashlib.PrivateKey()

    let stealthTx = await this.constructStealthTransaction(ephemeralPrivKey, destPubKey, amount)
    let stealthTxId = Buffer.from(stealthTx.id, 'hex')
    let electrumHandler = store.getters['electrumHandler/getClient']

    // Broadcast transaction
    let stealthTxHex = stealthTx.toString()
    await electrumHandler.blockchainTransaction_broadcast(stealthTxHex)

    await new Promise(resolve => setTimeout(resolve, 5000)) // TODO: This is hacky as fuck

    stealthPaymentEntry.setEphemeralPubKey(ephemeralPrivKey.toPublicKey().toBuffer())
    stealthPaymentEntry.setTxId(stealthTxId)
    stealthPaymentEntry.setMemo(memo)

    let paymentEntryRaw = stealthPaymentEntry.serializeBinary()
    paymentEntry.setEntryData(paymentEntryRaw)

    // Aggregate entries
    let entries = new messages.Entries()
    entries.addEntries(paymentEntry)

    let payload = this.constructPayload(entries, privKey, destPubKey, scheme)
    let message = await this.constructMessage(payload, privKey, destPubKey)
    return message
  },
  async constructTextMessage (text, privKey, destPubKey, scheme) {
    // Construct text entry
    let textEntry = new messages.Entry()
    textEntry.setKind('text-utf8')
    let rawText = new TextEncoder('utf-8').encode(text)
    textEntry.setEntryData(rawText)

    // Aggregate entries
    let entries = new messages.Entries()
    entries.addEntries(textEntry)

    let payload = this.constructPayload(entries, privKey, destPubKey, scheme)
    let message = await this.constructMessage(payload, privKey, destPubKey)
    return message
  },
  constructPriceFilterApplication (isPublic, acceptancePrice, notificationPrice, privKey) {
    // Construct PriceFilter
    let priceFilter = new filters.PriceFilter()
    priceFilter.setPublic(isPublic)
    priceFilter.setAcceptancePrice(acceptancePrice)
    priceFilter.setNotificationPrice(notificationPrice)

    // Construct Filter
    let filtersMsg = new filters.Filters()
    filtersMsg.setPriceFilter(priceFilter)

    // Construct FilterApplication
    let serializedFilters = filtersMsg.serializeBinary()
    let hashbuf = cashlib.crypto.Hash.sha256(serializedFilters)
    let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    let filterApplication = new filters.FilterApplication()
    let sig = ecdsa.sig.toCompact(1).slice(1)
    filterApplication.setPubKey(privKey.toPublicKey().toBuffer())
    filterApplication.setSignature(sig)
    filterApplication.setScheme(1)
    filterApplication.setSerializedFilters(serializedFilters)

    return filterApplication
  }
}
