import { PrivateKey, PublicKey } from 'bitcore-lib-cash'

const forge = require('node-forge')
const cashlib = require('bitcore-lib-cash')

export const constructPayloadHmac = function (sharedKey, payloadDigest) {
  return cashlib.crypto.Hash.sha256hmac(sharedKey, payloadDigest)
}

export const constructStealthPubKey = function (emphemeralPrivKey, destinationPublicKey) {
  const dhKeyPoint = destinationPublicKey.point.mul(emphemeralPrivKey.bn) // ebG
  const dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  const digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  const digestPublicKey = PrivateKey.fromBuffer(digest).toPublicKey() // H(ebG)G

  const stealthPublicKey = PublicKey(digestPublicKey.point.add(destinationPublicKey.point)) // H(ebG)G + bG
  return new cashlib.HDPublicKey({
    publicKey: stealthPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: digest.slice(0, 32),
    parentFingerPrint: 0
  })
}

export const constructStealthPrivKey = function (emphemeralPubKey, destinationPrivateKey) {
  const dhKeyPoint = emphemeralPubKey.point.mul(destinationPrivateKey.bn) // ebG
  const dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  const digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  const digestBn = cashlib.crypto.BN.fromBuffer(digest)

  const stealthPrivBn = digestBn.add(destinationPrivateKey.bn).mod(cashlib.crypto.Point.getN()) // H(ebG) + b
  const stealthPrivateKey = PrivateKey(stealthPrivBn)
  return new cashlib.HDPrivateKey({
    privateKey: stealthPrivateKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: digest.slice(0, 32),
    parentFingerPrint: 0
  })
}

export const constructStampPublicKey = function (payloadDigest, destinationPublicKey) {
  const digestPrivateKey = PrivateKey.fromBuffer(payloadDigest)
  const digestPublicKey = digestPrivateKey.toPublicKey()
  const stampPoint = destinationPublicKey.point.add(digestPublicKey.point)
  const stampPublicKey = PublicKey.fromPoint(stampPoint)
  return stampPublicKey
}

export const constructStampHDPublicKey = function (payloadDigest, destinationPublicKey) {
  const stampPublicKey = constructStampPublicKey(payloadDigest, destinationPublicKey)
  return new cashlib.HDPublicKey({
    publicKey: stampPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: payloadDigest,
    parentFingerPrint: 0
  })
}

export const constructStampPrivateKey = function (payloadDigest, destinationPrivateKey) {
  const digestBn = cashlib.crypto.BN.fromBuffer(payloadDigest)
  const stampPrivBn = digestBn.add(destinationPrivateKey.bn).mod(cashlib.crypto.Point.getN())
  const stampPrivKey = PrivateKey(stampPrivBn)
  return stampPrivKey
}

export const constructStampHDPrivateKey = function (payloadDigest, destinationPrivateKey) {
  const stampPrivateKey = constructStampPrivateKey(payloadDigest, destinationPrivateKey)
  return new cashlib.HDPrivateKey({
    privateKey: stampPrivateKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: payloadDigest,
    parentFingerPrint: 0
  })
}

export const constructStampAddress = function (outpointDigest, privKey) {
  const digestBn = cashlib.crypto.BN.fromBuffer(outpointDigest)
  const stampPrivBn = privKey.bn.add(digestBn).mod(cashlib.crypto.Point.getN())
  const stampAddress = PrivateKey(stampPrivBn).toAddress('testnet')
  return stampAddress
}

export const encrypt = function (sharedKey, plainText) {
  // Split shared key
  const iv = new forge.util.ByteBuffer(sharedKey.slice(0, 16))
  const key = new forge.util.ByteBuffer(sharedKey.slice(16))

  // Encrypt entries
  const cipher = forge.aes.createEncryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(plainText)
  cipher.update(rawBuffer)
  cipher.finish()
  const cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster

  return cipherText
}

export const decrypt = function (sharedKey, cipherText) {
  // Split shared key
  const iv = new forge.util.ByteBuffer(sharedKey.slice(0, 16))
  const key = new forge.util.ByteBuffer(sharedKey.slice(16))

  // Encrypt entries
  const cipher = forge.aes.createDecryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(cipherText)
  cipher.update(rawBuffer)
  cipher.finish()
  const plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
  return plainText
}
