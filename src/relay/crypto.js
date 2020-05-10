import { PrivateKey, PublicKey } from 'bitcore-lib-cash'

const forge = require('node-forge')
const cashlib = require('bitcore-lib-cash')

export const constructStealthPubKey = function (emphemeralPrivKey, destPubKey) {
  const dhKeyPoint = destPubKey.point.mul(emphemeralPrivKey.bn) // ebG
  const dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  const digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  const digestPublicKey = PrivateKey.fromBuffer(digest).toPublicKey() // H(ebG)G

  const stealthPublicKey = PublicKey(digestPublicKey.point.add(destPubKey.point)) // H(ebG)G + bG
  return new cashlib.HDPublicKey({
    publicKey: stealthPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: digest.slice(0, 32),
    parentFingerPrint: 0
  })
}

export const constructStealthPrivKey = function (emphemeralPubKey, privKey) {
  const dhKeyPoint = emphemeralPubKey.point.mul(privKey.bn) // ebG
  const dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  const digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  const digestBn = cashlib.crypto.BN.fromBuffer(digest)

  const stealthPrivBn = digestBn.add(privKey.bn).mod(cashlib.crypto.Point.getN()) // H(ebG) + b
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

export const constructStampPubKey = function (outpointDigest, destPubKey) {
  const digestPrivateKey = PrivateKey.fromBuffer(outpointDigest)
  const digestPublicKey = digestPrivateKey.toPublicKey()
  const stampPoint = digestPublicKey.point.add(destPubKey.point)
  const stampPublicKey = PublicKey.fromPoint(stampPoint)
  return new cashlib.HDPublicKey({
    publicKey: stampPublicKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: outpointDigest.slice(0, 32),
    parentFingerPrint: 0
  })
}

export const constructStampPrivKey = function (outpointDigest, privKey) {
  const digestBn = cashlib.crypto.BN.fromBuffer(outpointDigest)
  const stampPrivBn = privKey.bn.add(digestBn).mod(cashlib.crypto.Point.getN())
  const stampPrivKey = PrivateKey(stampPrivBn)
  const key = new cashlib.HDPrivateKey({
    privateKey: stampPrivKey.toBuffer(),
    depth: 0,
    network: 'testnet',
    childIndex: 0,
    chainCode: outpointDigest.slice(0, 32),
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

export const constructDHKeyFromEphemPubKey = function (ephemeralPubKey, sourcePubkey, destPrivKey) {
  // Construct DH key
  const destPrivKeyBn = destPrivKey.toBigNumber()
  const dhKeyPoint = ephemeralPubKey.point.mul(destPrivKeyBn).add(sourcePubkey.point)
  const dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  // Extract encryption params from digest
  const digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw)
  const iv = new forge.util.ByteBuffer(digest.slice(0, 16))
  const key = new forge.util.ByteBuffer(digest.slice(16))

  return { key, iv }
}

export const encrypt = function (plainText, privKey, destPubKey) {
  // Generate new (random) emphemeral key
  const ephemeralPrivKey = PrivateKey()

  // Construct DH key
  const { key, iv } = constructDHKeyFromEphemPrivKey(ephemeralPrivKey, privKey, destPubKey)

  // Encrypt entries
  const cipher = forge.aes.createEncryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(plainText)
  cipher.update(rawBuffer)
  cipher.finish()
  const cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster

  return { cipherText, ephemeralPrivKey }
}

export const decrypt = function (cipherText, destPrivKey, sourcePubkey, ephemeralPubKey) {
  // Construct DH key
  const { key, iv } = constructDHKeyFromEphemPubKey(ephemeralPubKey, sourcePubkey, destPrivKey)

  // Encrypt entries
  const cipher = forge.aes.createDecryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(cipherText)
  cipher.update(rawBuffer)
  cipher.finish()
  const plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
  return plainText
}

export const decryptWithEphemPrivKey = function (cipherText, ephemeralPrivKey, privKey, destPubKey) {
  // Construct DH key
  const { key, iv } = constructDHKeyFromEphemPrivKey(ephemeralPrivKey, privKey, destPubKey)

  // Encrypt entries
  const cipher = forge.aes.createDecryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(cipherText)
  cipher.update(rawBuffer)
  cipher.finish()
  const plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
  return plainText
}

export const encryptEphemeralKey = function (ephemeralPrivKey, privKey, entriesDigest) {
  // Construct AES key
  const mergedKey = Buffer.concat([privKey.toBuffer(), entriesDigest]) // p || H(entries)

  const mergedDigest = cashlib.crypto.Hash.sha256(mergedKey) // H(H(entries) . p))
  const iv = new forge.util.ByteBuffer(mergedDigest.slice(0, 16))
  const key = new forge.util.ByteBuffer(mergedDigest.slice(16))

  // Encrypt ephemeral key
  const ephemeralKeyRaw = ephemeralPrivKey.toBuffer()
  const cipher = forge.aes.createEncryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(ephemeralKeyRaw)
  cipher.update(rawBuffer)
  cipher.finish()
  const cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
  return cipherText
}

export const decryptEphemeralKey = function (cipherText, privKey, entriesDigest) {
  // Construct AES key
  const mergedKey = Buffer.concat([privKey.toBuffer(), entriesDigest]) // p || H(entries)

  const mergedDigest = cashlib.crypto.Hash.sha256(mergedKey) // H(H(entries) . p))
  const iv = new forge.util.ByteBuffer(mergedDigest.slice(0, 16))
  const key = new forge.util.ByteBuffer(mergedDigest.slice(16))

  // Encrypt ephemeral key
  const cipher = forge.aes.createDecryptionCipher(key, 'CBC')
  cipher.start(iv)
  const rawBuffer = new forge.util.ByteBuffer(cipherText)
  cipher.update(rawBuffer)
  cipher.finish()
  const plainText = Buffer.from(cipher.output.toHex(), 'hex') // TODO: Faster

  return PrivateKey.fromBuffer(plainText)
}
