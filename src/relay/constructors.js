import { Header, Message, PayloadEntry, Profile, ProfileEntry, Stamp, StampOutpoints } from './relay_pb'
import stealth from './stealth_pb'
import filters from './filters_pb'
import { constructStampHDPublicKey, constructStealthPubKey, constructPayloadHmac, encrypt } from './crypto'
import VCard from 'vcf'
// import { * } from '../keyserver/keyserver_pb'
import wrapper from '../auth_wrapper/wrapper_pb'

const cashlib = require('bitcore-lib-cash')
const assert = require('assert')

export const constructStampTransactions = function (wallet, payloadDigest, destPubKey, amount) {
  assert(payloadDigest instanceof Buffer)

  // Stamp output
  const stampHDPubKey = constructStampHDPublicKey(payloadDigest, destPubKey)
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
  const transactionBundle = wallet.constructTransactionSet({ addressGenerator: stealthPubKeyGenerator, amount })
  return transactionBundle
}

export const constructMessage = function (wallet, plainTextPayload, sourcePrivateKey, destinationPublicKey, stampAmount) {
  const plainPayloadDigest = cashlib.crypto.Hash.sha256(plainTextPayload)

  // Construct salt
  const rawSourcePrivateKey = sourcePrivateKey.toBuffer()
  const salt = cashlib.crypto.Hash.sha256hmac(plainPayloadDigest, rawSourcePrivateKey)

  // Construct shared key
  const mergedKey = cashlib.PublicKey.fromPoint(destinationPublicKey.point.mul(sourcePrivateKey.toBigNumber()))
  const rawMergedKey = mergedKey.toBuffer()
  const sharedKey = cashlib.crypto.Hash.sha256hmac(salt, rawMergedKey)

  // Encrypt payload
  const payload = encrypt(sharedKey, plainTextPayload)

  // Calculate payload hmac
  const payloadDigest = cashlib.crypto.Hash.sha256(payload)
  const payloadHmac = constructPayloadHmac(sharedKey, payloadDigest)

  // Get transaction bundle from wallet
  try {
    const transactionBundle = constructStampTransactions(wallet, payloadDigest, destinationPublicKey, stampAmount)
    // Construct Stamp
    const stamp = new Stamp()
    stamp.setStampType(1)
    for (const { transaction: stampTx, vouts } of transactionBundle) {
      const rawStampTx = stampTx.toBuffer()
      const stampOutpoints = new StampOutpoints()
      stampOutpoints.setStampTx(rawStampTx)
      vouts.forEach((vout) => stampOutpoints.addVouts(vout))
      stamp.addStampOutpoints(stampOutpoints)
    }

    // Construct message
    const message = new Message()
    const rawSourcePublickey = sourcePrivateKey.toPublicKey().toBuffer()
    const rawDestinationPublicKey = destinationPublicKey.toBuffer()
    message.setScheme(1)
    message.setDestinationPublicKey(rawDestinationPublicKey)
    message.setSourcePublicKey(rawSourcePublickey)
    message.setPayload(payload)
    message.setPayloadHmac(payloadHmac)
    message.setSalt(salt)
    message.setStamp(stamp)

    return { message, transactionBundle, payloadDigest }
  } catch (err) {
    throw Object({
      payloadDigest,
      err
    })
  }
}

export const constructReplyEntry = function ({ payloadDigest }) {
  assert(typeof payloadDigest === 'string')
  const payloadDigestBuffer = Buffer.from(payloadDigest, 'hex')

  const entry = new PayloadEntry()
  entry.setKind('reply')
  entry.setBody(payloadDigestBuffer)
  return entry
}

export const constructTextEntry = function ({ text }) {
  // Add text entry
  const textEntry = new PayloadEntry()
  textEntry.setKind('text-utf8')
  const rawText = new TextEncoder('utf-8').encode(text)
  textEntry.setBody(rawText)
  return textEntry
}

export const constructStealthEntry = function ({ wallet, amount, destPubKey }) {
  // Construct payment entry
  const paymentEntry = new PayloadEntry()
  paymentEntry.setKind('stealth-payment')

  const stealthPaymentEntry = new stealth.StealthPaymentEntry()
  const ephemeralPrivKey = cashlib.PrivateKey()

  const transactionBundle = constructStealthTransactions(wallet, ephemeralPrivKey, destPubKey, amount)

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
  paymentEntry.setBody(paymentEntryRaw)

  return { paymentEntry, transactionBundle }
}

export const constructImageEntry = function ({ image }) {
  // Construct text entry
  const imgEntry = new PayloadEntry()
  imgEntry.setKind('image')

  const arr = image.split(',')
  const avatarType = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const rawAvatar = new Uint8Array(n)

  while (n--) {
    rawAvatar[n] = bstr.charCodeAt(n)
  }
  const imgHeader = new Header()
  imgHeader.setName('data')
  imgHeader.setValue(avatarType)
  imgEntry.setBody(rawAvatar)
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

export const constructProfileMetadata = function (profileObj, priceFilter, privKey) {
  // Construct vCard
  const vCard = new VCard()
  vCard.set('fn', profileObj.name)
  vCard.set('note', profileObj.bio)
  const rawCard = new TextEncoder().encode(vCard.toString())

  const cardEntry = new ProfileEntry()
  cardEntry.setKind('vcard')
  cardEntry.setBody(rawCard)

  // Construct avatar
  const imgEntry = new ProfileEntry()
  imgEntry.setKind('avatar')

  const arr = profileObj.avatar.split(',')
  const avatarType = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const rawAvatar = new Uint8Array(n)

  while (n--) {
    rawAvatar[n] = bstr.charCodeAt(n)
  }
  const imgHeader = new Header()
  imgHeader.setName('data')
  imgHeader.setValue(avatarType)
  imgEntry.setBody(rawAvatar)
  imgEntry.addHeaders(imgHeader)

  // Construct price filter
  const filterEntry = new ProfileEntry()
  filterEntry.setKind('price-filter')
  const rawPriceFilter = priceFilter.serializeBinary()
  filterEntry.setBody(rawPriceFilter)

  // Construct payload
  const profile = new Profile()
  profile.setTimestamp(Math.floor(Date.now() / 1000))
  profile.setTtl(31556952) // 1 year
  profile.addEntries(cardEntry)
  profile.addEntries(imgEntry)
  profile.addEntries(filterEntry)

  const rawProfile = profile.serializeBinary()
  const hashbuf = cashlib.crypto.Hash.sha256(rawProfile)
  const ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
  ecdsa.sign()

  const authWrapper = new wrapper.AuthWrapper()
  const sig = ecdsa.sig.toCompact(1).slice(1)
  authWrapper.setPublicKey(privKey.toPublicKey().toBuffer())
  authWrapper.setSignature(sig)
  authWrapper.setScheme(1)
  authWrapper.setPayload(rawProfile)

  return authWrapper
}
