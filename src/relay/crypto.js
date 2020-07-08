import { PrivateKey, PublicKey } from 'bitcore-lib-cash'

const forge = require('node-forge')
const cashlib = require('bitcore-lib-cash')

export const constructPayloadHmac = function (sharedKey, payloadDigest) {
  return cashlib.hash.Hash.sha256hmac(sharedKey, payloadDigest)
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

export const constructStampPubKey = function (payloadDigest, destinationPublicKey) {
  const digestPrivateKey = PrivateKey.fromBuffer(payloadDigest)
  const digestPublicKey = digestPrivateKey.toPublicKey()
  const stampPoint = digestPublicKey.point.add(destinationPublicKey.point)
  const stampPublicKey = PublicKey.fromPoint(stampPoint)
  return new cashlib.HDPublicKey({
    publicKey: stampPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: payloadDigest.slice(0, 32),
    parentFingerPrint: 0
  })
}

export const constructStampPrivKey = function (payloadDigest, destinationPrivateKey) {
  const digestBn = cashlib.crypto.BN.fromBuffer(payloadDigest)
  const stampPrivBn = destinationPrivateKey.bn.add(digestBn).mod(cashlib.crypto.Point.getN())
  const stampPrivKey = PrivateKey(stampPrivBn)
  const key = new cashlib.HDPrivateKey({
    privateKey: stampPrivKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: payloadDigest.slice(0, 32),
    parentFingerPrint: 0
  })
  return key
}

export const constructStampAddress = function (outpointDigest, privKey) {
  const digestBn = cashlib.crypto.BN.fromBuffer(outpointDigest)
  const stampPrivBn = privKey.bn.add(digestBn).mod(cashlib.crypto.Point.getN())
  const stampAddress = PrivateKey(stampPrivBn).toAddress('testnet')
  return stampAddress
}

export const constructDHKeyFromEphemPrivKey = function (ephemeralPrivKey, privKey, destPubKey) {
  // Generate new (random) emphemeral key
  const emphemeralPrivKeyBn = ephemeralPrivKey.toBigNumber()

  // Construct DH key
  const dhKeyPoint = destPubKey.point.mul(emphemeralPrivKeyBn).add(privKey.toPublicKey().point)
  const dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  // Extract encryption params from digest
  const digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw)
  const iv = new forge.util.ByteBuffer(digest.slice(0, 16))
  const key = new forge.util.ByteBuffer(digest.slice(16))

  return { key, iv }
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
