import { PrivateKey, PublicKey, crypto, HDPublicKey, HDPrivateKey } from 'bitcore-lib-cash'

import forge from 'node-forge'

export const constructPayloadHmac = function (sharedKey, payloadDigest) {
  return crypto.Hash.sha256hmac(sharedKey, payloadDigest)
}

export const constructMergedKey = function (privateKey, publicKey) {
  return PublicKey.fromPoint(publicKey.point.mul(privateKey.toBigNumber()))
}

export const constructSharedKey = function (privateKey, publicKey, salt) {
  const mergedKey = constructMergedKey(privateKey, publicKey)
  const rawMergedKey = mergedKey.toBuffer()
  return crypto.Hash.sha256hmac(salt, rawMergedKey)
}

export const constructStealthPublicKey = function (emphemeralPrivKey, destinationPublicKey) {
  const dhKeyPoint = destinationPublicKey.point.mul(emphemeralPrivKey.bn) // ebG
  const dhKeyPointRaw = crypto.Point.pointToCompressed(dhKeyPoint)

  const digest = crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  const digestPublicKey = PrivateKey.fromBuffer(digest).toPublicKey() // H(ebG)G

  const stealthPublicKey = PublicKey(digestPublicKey.point.add(destinationPublicKey.point)) // H(ebG)G + bG
  return { stealthPublicKey, digest }
}

export const constructHDStealthPublicKey = function (emphemeralPrivKey, destinationPublicKey) {
  const { stealthPublicKey, digest } = constructStealthPublicKey(emphemeralPrivKey, destinationPublicKey)
  return new HDPublicKey({
    publicKey: stealthPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: digest,
    parentFingerPrint: 0
  })
}

export const constructStealthPrivateKey = function (emphemeralPubKey, destinationPrivateKey) {
  const dhKeyPoint = emphemeralPubKey.point.mul(destinationPrivateKey.bn) // ebG
  const dhKeyPointRaw = crypto.Point.pointToCompressed(dhKeyPoint)

  const digest = crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  const digestBn = crypto.BN.fromBuffer(digest)

  const stealthPrivBn = digestBn.add(destinationPrivateKey.bn).mod(crypto.Point.getN()) // H(ebG) + b
  const stealthPrivateKey = PrivateKey(stealthPrivBn)
  return { stealthPrivateKey, digest }
}

export const constructHDStealthPrivateKey = function (emphemeralPubKey, destinationPrivateKey) {
  const { stealthPrivateKey, digest } = constructStealthPrivateKey(emphemeralPubKey, destinationPrivateKey)
  return new HDPrivateKey({
    privateKey: stealthPrivateKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: digest,
    parentFingerPrint: 0
  })
}

export const constructStampPublicKey = function (payloadDigest, destinationPublicKey) {
  const digestPrivateKey = PrivateKey.fromBuffer(payloadDigest)
  const digestPublicKey = digestPrivateKey.toPublicKey()
  const stampPoint = digestPublicKey.point.add(destinationPublicKey.point)
  const stampPublicKey = PublicKey.fromPoint(stampPoint)
  return stampPublicKey
}

export const constructStampHDPublicKey = function (payloadDigest, destinationPublicKey) {
  const stampPublicKey = constructStampPublicKey(payloadDigest, destinationPublicKey)
  return new HDPublicKey({
    publicKey: stampPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: payloadDigest,
    parentFingerPrint: 0
  })
}

export const constructStampPrivateKey = function (payloadDigest, destinationPrivateKey) {
  const digestBn = crypto.BN.fromBuffer(payloadDigest)
  const stampPrivBn = digestBn.add(destinationPrivateKey.bn).mod(crypto.Point.getN())
  const stampPrivKey = PrivateKey(stampPrivBn)
  return stampPrivKey
}

export const constructStampHDPrivateKey = function (payloadDigest, destinationPrivateKey) {
  const stampPrivateKey = constructStampPrivateKey(payloadDigest, destinationPrivateKey)
  return new HDPrivateKey({
    privateKey: stampPrivateKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: payloadDigest,
    parentFingerPrint: 0
  })
}

export const constructStampAddress = function (outpointDigest, privKey) {
  const digestBn = crypto.BN.fromBuffer(outpointDigest)
  const stampPrivBn = privKey.bn.add(digestBn).mod(crypto.Point.getN())
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
