import messages from './messages_pb'
import filters from './filters_pb'
import crypto from './crypto'
import store from '../store/index'

const cashlib = require('bitcore-lib-cash')

export default {
  async constructStampTransaction (payloadDigest, destPubKey, amount) {
    // Update UTXOs
    await store.dispatch('wallet/updateUTXOs')

    // Collect inputs
    let addresses = store.getters['wallet/getAddresses']
    let inputUTXOs = []
    let signingKeys = []
    let fee = 500 // TODO: Not const
    let inputValue = 0
    let utxos = await store.getters['wallet/getUTXOs']

    for (let i in utxos) {
      let output = utxos[i]
      inputValue += output.satoshis
      let addr = output.address
      output['script'] = cashlib.Script.buildPublicKeyHashOut(addr).toHex()
      inputUTXOs.push(output)

      let signingKey = addresses[addr].privKey
      signingKeys.push(signingKey)
      if (amount + fee < inputValue) {
        break
      }
    }

    // Construct Transaction
    let transaction = new cashlib.Transaction()

    // Add inputs
    for (let i in inputUTXOs) {
      transaction = transaction.from(inputUTXOs[i])
    }

    // Add stamp output
    let stampAddress = crypto.constructStampAddress(payloadDigest, destPubKey)
    transaction = transaction.addOutput(new cashlib.Transaction.Output({
      script: cashlib.Script(new cashlib.Address(stampAddress)),
      satoshis: amount
    }))

    // Add change Output
    transaction = transaction.fee(fee).change(Object.keys(addresses)[0])

    // Sign
    for (let i in signingKeys) {
      transaction = transaction.sign(signingKeys[i])
    }

    return transaction
  },
  async constructMessage (serializedPayload, privKey, destPubKey) {
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
  async constructTextMessage (text, privKey, destPubKey, scheme) {
    // Construct text entry
    let textEntry = new messages.Entry()
    textEntry.setKind('text-utf8')
    let rawText = new TextEncoder('utf-8').encode(text)
    textEntry.setEntryData(rawText)

    // Aggregate entries
    let entries = new messages.Entries()
    entries.addEntries(textEntry)

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
    let serializedPayload = payload.serializeBinary()

    let message = await this.constructMessage(serializedPayload, privKey, destPubKey)
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
