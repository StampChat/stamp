import { PrivateKey, PublicKey } from 'bitcore-lib-cash'

const forge = require('node-forge')
const cashlib = require('bitcore-lib-cash')

export default {
  constructStampAddress (payloadDigest, destPubKey) {
    let digestPrivateKey = PrivateKey.fromBuffer(payloadDigest)
    let digestPublicKey = digestPrivateKey.toPublicKey()

    let stampPoint = digestPublicKey.point.add(destPubKey.point)
    let stampPublicKey = PublicKey.fromPoint(stampPoint)

    return stampPublicKey.toAddress('testnet')
  },
  encrypt (plainText, privKey, destPubKey) {
    // Generate new (random) emphemeral key
    let ephemeralPrivKey = PrivateKey()
    let emphemeralPrivKeyBn = ephemeralPrivKey.toBigNumber()

    // Construct DH key
    let dhKeyPoint = destPubKey.point.mul(emphemeralPrivKeyBn).add(privKey.toPublicKey().point)
    let dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

    // Extract encryption params from digest
    let digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw)
    let iv = new forge.util.ByteBuffer(digest.slice(0, 16)) // TODO: Double check whether IV is appropriate
    let key = new forge.util.ByteBuffer(digest.slice(16))

    // Encrypt entries
    let cipher = forge.aes.createEncryptionCipher(key, 'CBC')
    cipher.start(iv)
    let rawBuffer = new forge.util.ByteBuffer(plainText)
    cipher.update(rawBuffer)
    cipher.finish()
    let cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster

    // Get empheral public key point
    let ephemeralPubKey = ephemeralPrivKey.toPublicKey()

    return { cipherText, ephemeralPubKey }
  },
  decrypt (cipherText, destPrivKey, sourcePubkey, ephemeralPubKey) {
    // Construct DH key
    let destPrivKeyBn = destPrivKey.toBigNumber()
    let dhKeyPoint = ephemeralPubKey.point.mul(destPrivKeyBn).add(sourcePubkey.point)
    let dhKeyPointRaw = cashlib.crypto.Point.pointToCompressed(dhKeyPoint)

    // Extract encryption params from digest
    let digest = cashlib.crypto.Hash.sha256(dhKeyPointRaw)
    let iv = new forge.util.ByteBuffer(digest.slice(0, 16)) // TODO: Double check whether IV is appropriate
    let key = new forge.util.ByteBuffer(digest.slice(16))

    // Encrypt entries
    let cipher = forge.aes.createDecryptionCipher(key, 'CBC')
    cipher.start(iv)
    let rawBuffer = new forge.util.ByteBuffer(cipherText)
    cipher.update(rawBuffer)
    cipher.finish()
    let plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
    return plainText
  }
}
