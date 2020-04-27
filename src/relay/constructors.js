import messaging from './messaging_pb'
import stealth from './stealth_pb'
import filters from './filters_pb'
import { constructStampPubKey, constructStealthPubKey, encrypt, encryptEphemeralKey } from './crypto'
import VCard from 'vcf'
import addressmetadata from '../keyserver/addressmetadata_pb'
import wrapper from '../pop/wrapper_pb'

const cashlib = require('bitcore-lib-cash')
const assert = require('assert')

export const constructStampTransaction = function (wallet, payloadDigest, destPubKey, amount) {
  assert(payloadDigest instanceof Buffer)

  // Stamp output
  let stampHDPubKey = constructStampPubKey(payloadDigest, destPubKey)
  // Assuming one txn and one output for now.
  const transactionNumber = 0// This should be the index of the transaction in the outpoint list
  const outputNumber = 0 // This should the index in the outpoint list *NOT* the vout.  Otherwise they can't be reordered before signing

  const outpointPubKey = stampHDPubKey.deriveChild(44)
    .deriveChild(145)
    .deriveChild(transactionNumber)
    .deriveChild(outputNumber)
    .publicKey

  let stampOutput = new cashlib.Transaction.Output({
    script: cashlib.Script(new cashlib.Address(outpointPubKey)),
    satoshis: amount
  })

  // Construct transaction
  let { transaction, usedIDs } = wallet.constructTransaction({ outputs: [stampOutput] })
  return { transaction, usedIDs }
}

export const constructStealthTransaction = function (wallet, ephemeralPrivKey, destPubKey, amount) {
  // Add ephemeral output
  // NOTE: We're only doing 1 stealth txn, and 1 output for now.
  // But the spec should allow doing confidential amounts.
  const transactionNumber = 0// This should be the index of the transaction in the outpoint list
  const outputNumber = 0 // This should the index in the outpoint list *NOT* the vout.  Otherwise they can't be reordered before signing
  const stealthHDPubKey = constructStealthPubKey(ephemeralPrivKey, destPubKey)
  const stealthPubKey = stealthHDPubKey
    .deriveChild(44)
    .deriveChild(145)
    .deriveChild(transactionNumber)
    .deriveChild(outputNumber)
    .publicKey

  const stealthAddress = cashlib.PublicKey(cashlib.crypto.Point.pointToCompressed(stealthPubKey.point))

  const stealthOutput = new cashlib.Transaction.Output({
    script: cashlib.Script(new cashlib.Address(stealthAddress)),
    satoshis: amount
  })

  // Construct transaction
  const { transaction, usedIDs } = wallet.constructTransaction({ outputs: [stealthOutput] })
  return [{ transaction, vouts: [0], usedIDs }]
}

export const constructMessage = function (wallet, serializedPayload, privKey, destPubKey, stampAmount) {
  let payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
  let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf: payloadDigest })
  ecdsa.sign()

  let message = new messaging.Message()
  let sig = ecdsa.sig.toCompact(1).slice(1)
  let rawPubkey = privKey.toPublicKey().toBuffer()
  message.setSenderPubKey(rawPubkey)
  message.setSignature(sig)
  message.setSerializedPayload(serializedPayload)

  let { transaction, usedIDs } = constructStampTransaction(wallet, payloadDigest, destPubKey, stampAmount)
  let rawStampTx = transaction.toBuffer()
  let stampOutpoints = new messaging.StampOutpoints()
  stampOutpoints.setStampTx(rawStampTx)
  stampOutpoints.addVouts(0)

  message.addStampOutpoints(stampOutpoints)

  return { message, usedIDs, stampTx: transaction }
}

export const constructPayload = function (entries, privKey, destPubKey, scheme, timestamp = Date.now()) {
  const entriesPb = new messaging.Entries()
  let payload = new messaging.Payload()
  payload.setTimestamp(timestamp)
  let rawDestPubKey = destPubKey.toBuffer()
  payload.setDestination(rawDestPubKey)

  // Convert to PB
  for (const entry of entries) {
    entriesPb.addEntries(entry)
  }

  // Serialize and encrypt
  let rawEntries = entriesPb.serializeBinary()
  if (scheme === 0) {
    payload.setEntries(rawEntries)
    const serializedPayload = payload.serializeBinary()
    const payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
    return { serializedPayload, payloadDigest }
  } else if (scheme === 1) {
    let { cipherText, ephemeralPrivKey } = encrypt(rawEntries, privKey, destPubKey)
    let ephemeralPubKey = ephemeralPrivKey.toPublicKey()
    let ephemeralPubKeyRaw = ephemeralPubKey.toBuffer()
    let entriesDigest = cashlib.crypto.Hash.sha256(cipherText)
    let encryptedEphemeralKey = encryptEphemeralKey(ephemeralPrivKey, privKey, entriesDigest)

    payload.setEntries(cipherText)
    payload.setEphemeralPubKey(ephemeralPubKeyRaw)
    payload.setEphemeralPrivKey(encryptedEphemeralKey)
    payload.setScheme(messaging.Payload.EncryptionScheme.EPHEMERALDH)

    let serializedPayload = payload.serializeBinary()
    let payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
    return { serializedPayload, payloadDigest }
  }

  assert(false, 'Trying to create a payload with an unknown encryption scheme')
  return {}
}

export const constructReplyEntry = function ({ payloadDigest }) {
  assert(typeof payloadDigest === 'string')
  const payloadDigestBuffer = Buffer.from(payloadDigest, 'hex')

  let entry = new messaging.Entry()
  entry.setKind('reply')
  entry.setEntryData(payloadDigestBuffer)
  return entry
}

export const constructTextEntry = function ({ text }) {
  // Add text entry
  let textEntry = new messaging.Entry()
  textEntry.setKind('text-utf8')
  let rawText = new TextEncoder('utf-8').encode(text)
  textEntry.setEntryData(rawText)
  return textEntry
}

export const constructStealthEntry = function ({ wallet, amount, destPubKey }) {
  // Construct payment entry
  let paymentEntry = new messaging.Entry()
  paymentEntry.setKind('stealth-payment')

  let stealthPaymentEntry = new stealth.StealthPaymentEntry()
  let ephemeralPrivKey = cashlib.PrivateKey()

  var [{ transaction: stealthTx, usedIDs: stealthIdsUsed, vouts }] = constructStealthTransaction(wallet, ephemeralPrivKey, destPubKey, amount)

  stealthPaymentEntry.setEphemeralPubKey(ephemeralPrivKey.publicKey.toBuffer())
  let rawStealthTx = stealthTx.toBuffer()
  let stealthOutpoints = new stealth.StealthOutpoints()
  stealthOutpoints.setStealthTx(rawStealthTx)
  vouts.forEach((vout) => stealthOutpoints.addVouts(vout))
  stealthPaymentEntry.addOutpoints(stealthOutpoints)

  let paymentEntryRaw = stealthPaymentEntry.serializeBinary()
  paymentEntry.setEntryData(paymentEntryRaw)

  return { paymentEntry, stealthTx, usedIDs: stealthIdsUsed, vouts }
}

export const constructImageEntry = function ({ image }) {
  // Construct text entry
  let imgEntry = new messaging.Entry()
  imgEntry.setKind('image')

  let arr = image.split(',')
  let avatarType = arr[0].match(/:(.*?);/)[1]
  let bstr = atob(arr[1])
  let n = bstr.length
  let rawAvatar = new Uint8Array(n)

  while (n--) {
    rawAvatar[n] = bstr.charCodeAt(n)
  }
  let imgHeader = new messaging.Header()
  imgHeader.setName('data')
  imgHeader.setValue(avatarType)
  imgEntry.setEntryData(rawAvatar)
  imgEntry.addHeaders(imgHeader)

  return imgEntry
}

export const constructPriceFilter = function (isPublic, acceptancePrice, notificationPrice) {
  // Construct PriceFilter
  let priceFilter = new filters.PriceFilter()
  priceFilter.setPublic(isPublic)
  priceFilter.setAcceptancePrice(acceptancePrice)
  priceFilter.setNotificationPrice(notificationPrice)

  return priceFilter
}

export const constructProfileMetadata = function (profile, priceFilter, privKey) {
  // Construct vCard
  let vCard = new VCard()
  vCard.set('fn', profile.name)
  vCard.set('note', profile.bio)
  let rawCard = new TextEncoder().encode(vCard.toString())

  let cardEntry = new addressmetadata.Entry()
  cardEntry.setKind('vcard')
  cardEntry.setEntryData(rawCard)

  // Construct avatar
  let imgEntry = new addressmetadata.Entry()
  imgEntry.setKind('avatar')

  let arr = profile.avatar.split(',')
  let avatarType = arr[0].match(/:(.*?);/)[1]
  let bstr = atob(arr[1])
  let n = bstr.length
  let rawAvatar = new Uint8Array(n)

  while (n--) {
    rawAvatar[n] = bstr.charCodeAt(n)
  }
  let imgHeader = new addressmetadata.Header()
  imgHeader.setName('data')
  imgHeader.setValue(avatarType)
  imgEntry.setEntryData(rawAvatar)
  imgEntry.addHeaders(imgHeader)

  // Construct price filter
  let filterEntry = new addressmetadata.Entry()
  filterEntry.setKind('price-filter')
  let rawPriceFilter = priceFilter.serializeBinary()
  filterEntry.setEntryData(rawPriceFilter)

  // Construct payload
  let payload = new addressmetadata.Payload()
  payload.setTimestamp(Math.floor(Date.now() / 1000))
  payload.setTtl(31556952) // 1 year
  payload.addEntries(cardEntry)
  payload.addEntries(imgEntry)
  payload.addEntries(filterEntry)

  let serializedPayload = payload.serializeBinary()
  let hashbuf = cashlib.crypto.Hash.sha256(serializedPayload)
  let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
  ecdsa.sign()

  let metadata = new wrapper.AuthWrapper()
  let sig = ecdsa.sig.toCompact(1).slice(1)
  metadata.setPubKey(privKey.toPublicKey().toBuffer())
  metadata.setSignature(sig)
  metadata.setScheme(1)
  metadata.setSerializedPayload(serializedPayload)

  return metadata
}
