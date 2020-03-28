import { PrivateKey, PublicKey } from 'bitcore-lib-cash'

const forge = require('node-forge')
const cashlib = require('bitcore-lib-cash')

export const constructStealthPubKey = function (emphemeralPrivKey, destPubKey) {
  let dhKeyPoint = destPubKey.point.mul(emphemeralPrivKey.bn) // ebG
  let dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  let digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  let digestPublicKey = PrivateKey.fromBuffer(digest).toPublicKey() // H(ebG)G

  let stealthPublicKey = PublicKey(digestPublicKey.point.add(destPubKey.point)) // H(ebG)G + bG
  return stealthPublicKey
}

export const constructStealthPrivKey = function (emphemeralPubKey, privKey) {
  let dhKeyPoint = emphemeralPubKey.point.mul(privKey.bn) // ebG
  let dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  let digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
  let digestBn = cashlib.crypto.BN.fromBuffer(digest)

  let stealthPrivBn = digestBn.add(privKey.bn).mod(cashlib.crypto.Point.getN()) // H(ebG) + b
  return PrivateKey(stealthPrivBn)
}

export const constructStampPubKey = function (outpointDigest, destPubKey) {
  let digestPrivateKey = PrivateKey.fromBuffer(outpointDigest)
  let digestPublicKey = digestPrivateKey.toPublicKey()

  let stampPoint = digestPublicKey.point.add(destPubKey.point)
  let stampPublicKey = PublicKey.fromPoint(stampPoint)

  return stampPublicKey
}

export const constructStampPrivKey = function (outpointDigest, privKey) {
  let digestBn = cashlib.crypto.BN.fromBuffer(outpointDigest)
  let stampPrivBn = privKey.bn.add(digestBn).mod(cashlib.crypto.Point.getN())
  let stampPrivKey = PrivateKey(stampPrivBn)
  return stampPrivKey
}

export const constructStampAddress = function (outpointDigest, privKey) {
  let digestBn = cashlib.crypto.BN.fromBuffer(outpointDigest)
  let stampPrivBn = privKey.bn.add(digestBn).mod(cashlib.crypto.Point.getN())
  let stampAddress = PrivateKey(stampPrivBn).toAddress('testnet')
  return stampAddress
}

export const constructDHKeyFromEphemPrivKey = function (ephemeralPrivKey, privKey, destPubKey) {
  // Generate new (random) emphemeral key
  let emphemeralPrivKeyBn = ephemeralPrivKey.toBigNumber()

  // Construct DH key
  let dhKeyPoint = destPubKey.point.mul(emphemeralPrivKeyBn).add(privKey.toPublicKey().point)
  let dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  // Extract encryption params from digest
  let digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw)
  let iv = new forge.util.ByteBuffer(digest.slice(0, 16))
  let key = new forge.util.ByteBuffer(digest.slice(16))

  return { key, iv }
}

export const constructDHKeyFromEphemPubKey = function (ephemeralPubKey, sourcePubkey, destPrivKey) {
  // Construct DH key
  let destPrivKeyBn = destPrivKey.toBigNumber()
  let dhKeyPoint = ephemeralPubKey.point.mul(destPrivKeyBn).add(sourcePubkey.point)
  let dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

  // Extract encryption params from digest
  let digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw)
  let iv = new forge.util.ByteBuffer(digest.slice(0, 16))
  let key = new forge.util.ByteBuffer(digest.slice(16))

  return { key, iv }
}

export const encrypt = function (plainText, privKey, destPubKey) {
  // Generate new (random) emphemeral key
  let ephemeralPrivKey = PrivateKey()

  // Construct DH key
  let { key, iv } = constructDHKeyFromEphemPrivKey(ephemeralPrivKey, privKey, destPubKey)

  // Encrypt entries
  let cipher = forge.aes.createEncryptionCipher(key, 'CBC')
  cipher.start(iv)
  let rawBuffer = new forge.util.ByteBuffer(plainText)
  cipher.update(rawBuffer)
  cipher.finish()
  let cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster

  return { cipherText, ephemeralPrivKey }
}

export const decrypt = function (cipherText, destPrivKey, sourcePubkey, ephemeralPubKey) {
  // Construct DH key
  let { key, iv } = constructDHKeyFromEphemPubKey(ephemeralPubKey, sourcePubkey, destPrivKey)

  // Encrypt entries
  let cipher = forge.aes.createDecryptionCipher(key, 'CBC')
  cipher.start(iv)
  let rawBuffer = new forge.util.ByteBuffer(cipherText)
  cipher.update(rawBuffer)
  cipher.finish()
  let plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
  return plainText
}

export const decryptWithEphemPrivKey = function (cipherText, ephemeralPrivKey, privKey, destPubKey) {
    // Construct DH key
    let { key, iv } = constructDHKeyFromEphemPrivKey(ephemeralPrivKey, privKey, destPubKey)

    // Encrypt entries
    let cipher = forge.aes.createDecryptionCipher(key, 'CBC')
    cipher.start(iv)
    let rawBuffer = new forge.util.ByteBuffer(cipherText)
    cipher.update(rawBuffer)
    cipher.finish()
    let plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
    return plainText
}

export const encryptEphemPubKey = function (ephemeralPrivKey, privKey, entriesDigest) {
  // Construct AES key
  let mergedKey = Buffer.concat([privKey.toBuffer(), entriesDigest]) // p || H(entries)

  let mergedDigest = cashlib.crypto.Hash.sha256(mergedKey) // H(H(entries) . p))
  let iv = new forge.util.ByteBuffer(mergedDigest.slice(0, 16))
  let key = new forge.util.ByteBuffer(mergedDigest.slice(16))

  // Encrypt ephemeral key
  let ephemeralKeyRaw = ephemeralPrivKey.toBuffer()
  let cipher = forge.aes.createEncryptionCipher(key, 'CBC')
  cipher.start(iv)
  let rawBuffer = new forge.util.ByteBuffer(ephemeralKeyRaw)
  cipher.update(rawBuffer)
  cipher.finish()
  let cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
  return cipherText
}

export const decryptEphemeralKey = function (cipherText, privKey, entriesDigest) {
  // Construct AES key
  let mergedKey = Buffer.concat([privKey.toBuffer(), entriesDigest]) // p || H(entries)

  let mergedDigest = cashlib.crypto.Hash.sha256(mergedKey) // H(H(entries) . p))
  let iv = new forge.util.ByteBuffer(mergedDigest.slice(0, 16))
  let key = new forge.util.ByteBuffer(mergedDigest.slice(16))

  // Encrypt ephemeral key
  let cipher = forge.aes.createDecryptionCipher(key, 'CBC')
  cipher.start(iv)
  let rawBuffer = new forge.util.ByteBuffer(cipherText)
  cipher.update(rawBuffer)
  cipher.finish()
  let plainText = Buffer.from(cipher.output.toHex(), 'hex') // TODO: Faster

  return PrivateKey.fromBuffer(plainText)
}
