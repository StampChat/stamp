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

    // Get Fee
    let feePerByte = await store.dispatch('wallet/getFee')

    // Construct transaction
    let { transaction, usedIDs } = await store.dispatch('wallet/constructTransaction', { outputs: [stampOutput], feePerByte })
    return { transaction, usedIDs }
  },
  async constructStealthTransaction (ephemeralPrivKey, destPubKey, amount) {
    // Add ephemeral output
    let stealthAddress = crypto.constructStealthPubKey(ephemeralPrivKey, destPubKey).toAddress('testnet')
    let stampOutput = new cashlib.Transaction.Output({
      script: cashlib.Script(new cashlib.Address(stealthAddress)),
      satoshis: amount
    })

    // Get Fee
    let feePerByte = await store.dispatch('wallet/getFee')

    // Construct transaction
    let { transaction, usedIDs } = await store.dispatch('wallet/constructTransaction', { outputs: [stampOutput], feePerByte })
    return { transaction, usedIDs }
  },
  async constructMessage (payload, privKey, destPubKey, stampAmount) {
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
    console.log('construct')
    let { transaction, usedIDs } = await this.constructStampTransaction(payloadDigest, destPubKey, stampAmount)
    let rawStampTx = transaction.toBuffer()
    message.setStampTx(rawStampTx)

    return { message, usedIDs, stampTx: transaction }
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
  async constructTextMessage (text, privKey, destPubKey, scheme, stampAmount) {
    // Construct text entry
    let textEntry = new messages.Entry()
    textEntry.setKind('text-utf8')
    let rawText = new TextEncoder('utf-8').encode(text)
    textEntry.setEntryData(rawText)

    // Aggregate entries
    let entries = new messages.Entries()
    entries.addEntries(textEntry)

    let payload = this.constructPayload(entries, privKey, destPubKey, scheme)
    let { message, usedIDs, stampTx } = await this.constructMessage(payload, privKey, destPubKey, stampAmount)
    return { message, usedIDs, stampTx }
  },
  async constructStealthPaymentMessage (amount, memo, privKey, destPubKey, scheme, stampAmount) {
    let entries = new messages.Entries()

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

    let paymentEntryRaw = stealthPaymentEntry.serializeBinary()
    paymentEntry.setEntryData(paymentEntryRaw)
    entries.addEntries(paymentEntry)

    // Construct memo entry
    if (memo !== '') {
      let memoEntry = new messages.Entry()
      memoEntry.setKind('text-utf8')
      let rawText = new TextEncoder('utf-8').encode(memo)
      memoEntry.setEntryData(rawText)
      entries.addEntries(memoEntry)
    }

    let payload = this.constructPayload(entries, privKey, destPubKey, scheme)
    let { message, usedIDs, stampTx } = await this.constructMessage(payload, privKey, destPubKey, stampAmount)
    return { message, usedIDs, stampTx }
  },
  async constructImageMessage (image, caption, privKey, destPubKey, scheme, stampAmount) {
    let entries = new messages.Entries()

    // Construct text entry
    let imgEntry = new messages.Entry()
    imgEntry.setKind('image')

    let arr = image.split(',')
    let avatarType = arr[0].match(/:(.*?);/)[1]
    let bstr = atob(arr[1])
    let n = bstr.length
    let rawAvatar = new Uint8Array(n)

    while (n--) {
      rawAvatar[n] = bstr.charCodeAt(n)
    }
    let imgHeader = new messages.Header()
    imgHeader.setName('data')
    imgHeader.setValue(avatarType)
    imgEntry.setEntryData(rawAvatar)
    imgEntry.addHeaders(imgHeader)

    entries.addEntries(imgEntry)

    // Construct caption entry
    if (caption !== '') {
      let captionEntry = new messages.Entry()
      captionEntry.setKind('text-utf8')
      let rawText = new TextEncoder('utf-8').encode(caption)
      captionEntry.setEntryData(rawText)
      entries.addEntries(captionEntry)
    }

    let payload = this.constructPayload(entries, privKey, destPubKey, scheme)
    let { message, usedIDs, stampTx } = await this.constructMessage(payload, privKey, destPubKey, stampAmount)
    return { message, usedIDs, stampTx }
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
