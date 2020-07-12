import messaging from './messaging_pb'
import stealth from './stealth_pb'
import filters from './filters_pb'
import { constructStampPubKey, constructStealthPubKey, encrypt, encryptEphemeralKey } from './crypto'
import VCard from 'vcf'
import addressmetadata from '../keyserver/addressmetadata_pb'
import wrapper from '../pop/wrapper_pb'

const cashlib = require('bitcore-lib-cash')
const assert = require('assert')

export const constructStampTransactions = function (wallet, payloadDigest, destPubKey, amount) {
  assert(payloadDigest instanceof Buffer)

  // Stamp output
  const stampHDPubKey = constructStampPubKey(payloadDigest, destPubKey)
  // Assuming one txn and one output for now.
  let transactionNumber = 0// This should be the index of the transaction in the outpoint list
  const outputNumber = 0 // This should the index in the outpoint list *NOT* the vout.  Otherwise they can't be reordered before signing

  const stampAddressGenerator = () => {
    const outpointPubKey = stampHDPubKey.deriveChild(44)
      .deriveChild(145)
      .deriveChild(transactionNumber)
      .deriveChild(outputNumber)
      .publicKey
    const address = cashlib.PublicKey(cashlib.crypto.Point.pointToCompressed(outpointPubKey.point))
    transactionNumber += 1
    return address
  }

  // Construct transaction
  return wallet.constructTransactionSet({ addressGenerator: stampAddressGenerator, amount })
}

export const constructStealthTransactions = function (wallet, ephemeralPrivKey, destPubKey, amount) {
  // Add ephemeral output
  // NOTE: We're only doing 1 stealth txn, and 1 output for now.
  // But the spec should allow doing confidential amounts.
  let transactionNumber = 0// This should be the index of the transaction in the outpoint list
  const outputNumber = 0 // This should the index in the outpoint list *NOT* the vout.  Otherwise they can't be reordered before signing
  const stealthHDPubKey = constructStealthPubKey(ephemeralPrivKey, destPubKey)

  const stealthPubKeyGenerator = () => {
    const stealthPubKey = stealthHDPubKey
      .deriveChild(44)
      .deriveChild(145)
      .deriveChild(transactionNumber)
      .deriveChild(outputNumber)
      .publicKey
    const stealthAddress = cashlib.PublicKey(cashlib.crypto.Point.pointToCompressed(stealthPubKey.point))

    transactionNumber += 1
    return stealthAddress
  }

  // Construct transaction
  return wallet.constructTransactionSet({ addressGenerator: stealthPubKeyGenerator, amount })
}

export const constructMessage = async function (wallet, serializedPayload, privKey, destPubKey, stampAmount) {
  const payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
  const ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf: payloadDigest })
  ecdsa.sign()

  const message = new messaging.Message()
  const sig = ecdsa.sig.toCompact(1).slice(1)
  const rawPubkey = privKey.toPublicKey().toBuffer()
  message.setSenderPubKey(rawPubkey)
  message.setSignature(sig)
  message.setSerializedPayload(serializedPayload)

  const transactionBundle = await constructStampTransactions(wallet, payloadDigest, destPubKey, stampAmount)

  for (const { transaction: stampTx, vouts } of transactionBundle) {
    const rawStampTx = stampTx.toBuffer()
    const stampOutpoints = new messaging.StampOutpoints()
    stampOutpoints.setStampTx(rawStampTx)
    vouts.forEach((vout) => stampOutpoints.addVouts(vout))
    message.addStampOutpoints(stampOutpoints)
  }

  return { message, transactionBundle }
}

export const constructPayload = function (entries, privKey, destPubKey, scheme, timestamp = Date.now()) {
  const entriesPb = new messaging.Entries()
  const payload = new messaging.Payload()
  payload.setTimestamp(timestamp)
  const rawDestPubKey = destPubKey.toBuffer()
  payload.setDestination(rawDestPubKey)

  // Convert to PB
  for (const entry of entries) {
    entriesPb.addEntries(entry)
  }

  // Serialize and encrypt
  const rawEntries = entriesPb.serializeBinary()
  if (scheme === 0) {
    payload.setEntries(rawEntries)
    const serializedPayload = payload.serializeBinary()
    const payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
    return { serializedPayload, payloadDigest }
  } else if (scheme === 1) {
    const { cipherText, ephemeralPrivKey } = encrypt(rawEntries, privKey, destPubKey)
    const ephemeralPubKey = ephemeralPrivKey.toPublicKey()
    const ephemeralPubKeyRaw = ephemeralPubKey.toBuffer()
    const entriesDigest = cashlib.crypto.Hash.sha256(cipherText)
    const encryptedEphemeralKey = encryptEphemeralKey(ephemeralPrivKey, privKey, entriesDigest)

    payload.setEntries(cipherText)
    payload.setEphemeralPubKey(ephemeralPubKeyRaw)
    payload.setEphemeralPrivKey(encryptedEphemeralKey)
    payload.setScheme(messaging.Payload.EncryptionScheme.EPHEMERALDH)

    const serializedPayload = payload.serializeBinary()
    const payloadDigest = cashlib.crypto.Hash.sha256(serializedPayload)
    return { serializedPayload, payloadDigest }
  }

  assert(false, 'Trying to create a payload with an unknown encryption scheme')
  return {}
}

export const constructReplyEntry = function ({ payloadDigest }) {
  assert(typeof payloadDigest === 'string')
  const payloadDigestBuffer = Buffer.from(payloadDigest, 'hex')

  const entry = new messaging.Entry()
  entry.setKind('reply')
  entry.setEntryData(payloadDigestBuffer)
  return entry
}

export const constructTextEntry = function ({ text }) {
  // Add text entry
  const textEntry = new messaging.Entry()
  textEntry.setKind('text-utf8')
  const rawText = new TextEncoder('utf-8').encode(text)
  textEntry.setEntryData(rawText)
  return textEntry
}

export const constructStealthEntry = async function ({ wallet, amount, destPubKey }) {
  // Construct payment entry
  const paymentEntry = new messaging.Entry()
  paymentEntry.setKind('stealth-payment')

  const stealthPaymentEntry = new stealth.StealthPaymentEntry()
  const ephemeralPrivKey = cashlib.PrivateKey()

  const transactionBundle = await constructStealthTransactions(wallet, ephemeralPrivKey, destPubKey, amount)

  // Sent to HASH160(ephemeralPrivKey * destPubKey)
  // Sent to HASH160(ephemeralPrivKey * destPubKey)

  stealthPaymentEntry.setEphemeralPubKey(ephemeralPrivKey.publicKey.toBuffer())
  for (const { transaction: stealthTx, vouts } of transactionBundle) {
    const rawStealthTx = stealthTx.toBuffer()
    const stealthOutpoints = new stealth.StealthOutpoints()

    stealthOutpoints.setStealthTx(rawStealthTx)
    vouts.forEach((vout) => stealthOutpoints.addVouts(vout))
    stealthPaymentEntry.addOutpoints(stealthOutpoints)
  }

  const paymentEntryRaw = stealthPaymentEntry.serializeBinary()
  paymentEntry.setEntryData(paymentEntryRaw)

  return { paymentEntry, transactionBundle }
}

export const constructImageEntry = function ({ image }) {
  // Construct text entry
  const imgEntry = new messaging.Entry()
  imgEntry.setKind('image')

  const arr = image.split(',')
  const avatarType = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const rawAvatar = new Uint8Array(n)

  while (n--) {
    rawAvatar[n] = bstr.charCodeAt(n)
  }
  const imgHeader = new messaging.Header()
  imgHeader.setName('data')
  imgHeader.setValue(avatarType)
  imgEntry.setEntryData(rawAvatar)
  imgEntry.addHeaders(imgHeader)

  return imgEntry
}

export const constructPriceFilter = function (isPublic, acceptancePrice, notificationPrice) {
  // Construct PriceFilter
  const priceFilter = new filters.PriceFilter()
  priceFilter.setPublic(isPublic)
  priceFilter.setAcceptancePrice(acceptancePrice)
  priceFilter.setNotificationPrice(notificationPrice)

  return priceFilter
}

export const constructProfileMetadata = function (profile, priceFilter, privKey) {
  // Construct vCard
  const vCard = new VCard()
  vCard.set('fn', profile.name)
  vCard.set('note', profile.bio)
  const rawCard = new TextEncoder().encode(vCard.toString())

  const cardEntry = new addressmetadata.Entry()
  cardEntry.setKind('vcard')
  cardEntry.setEntryData(rawCard)

  // Construct avatar
  const imgEntry = new addressmetadata.Entry()
  imgEntry.setKind('avatar')

  const arr = profile.avatar.split(',')
  const avatarType = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const rawAvatar = new Uint8Array(n)

  while (n--) {
    rawAvatar[n] = bstr.charCodeAt(n)
  }
  const imgHeader = new addressmetadata.Header()
  imgHeader.setName('data')
  imgHeader.setValue(avatarType)
  imgEntry.setEntryData(rawAvatar)
  imgEntry.addHeaders(imgHeader)

  // Construct price filter
  const filterEntry = new addressmetadata.Entry()
  filterEntry.setKind('price-filter')
  const rawPriceFilter = priceFilter.serializeBinary()
  filterEntry.setEntryData(rawPriceFilter)

  // Construct payload
  const payload = new addressmetadata.Payload()
  payload.setTimestamp(Math.floor(Date.now() / 1000))
  payload.setTtl(31556952) // 1 year
  payload.addEntries(cardEntry)
  payload.addEntries(imgEntry)
  payload.addEntries(filterEntry)

  const serializedPayload = payload.serializeBinary()
  const hashbuf = cashlib.crypto.Hash.sha256(serializedPayload)
  const ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
  ecdsa.sign()

  const metadata = new wrapper.AuthWrapper()
  const sig = ecdsa.sig.toCompact(1).slice(1)
  metadata.setPubKey(privKey.toPublicKey().toBuffer())
  metadata.setSignature(sig)
  metadata.setScheme(1)
  metadata.setSerializedPayload(serializedPayload)

  return metadata
}
