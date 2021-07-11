import assert from 'assert'
import { PrivateKey, PublicKey, crypto, HDPublicKey, HDPrivateKey } from 'bitcore-lib-xpi'

import forge from 'node-forge'

export class PayloadConstructor {
  constructor ({ networkName }) {
    assert(networkName, 'Missing networkName while initializing PayloadConstructor')
    this.networkName = networkName
  }

  constructPayloadHmac (sharedKey, payloadDigest) {
    return crypto.Hash.sha256hmac(sharedKey, Buffer.from(payloadDigest))
  }

  constructMergedKey (privateKey, publicKey) {
    return PublicKey.fromPoint(publicKey.point.mul(privateKey.toBigNumber()))
  }

  constructSharedKey (privateKey, publicKey, salt) {
    const mergedKey = this.constructMergedKey(privateKey, publicKey)
    const rawMergedKey = mergedKey.toBuffer()
    const sharedKey = crypto.Hash.sha256hmac(Buffer.from(salt), rawMergedKey)
    return sharedKey
  }

  constructStealthPublicKey (emphemeralPrivKey, destinationPublicKey) {
    const dhKeyPoint = destinationPublicKey.point.mul(emphemeralPrivKey.bn) // ebG
    const dhKeyPointRaw = crypto.Point.pointToCompressed(dhKeyPoint)

    const digest = crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
    const digestPublicKey = PrivateKey.fromBuffer(digest).toPublicKey() // H(ebG)G

    const stealthPublicKey = PublicKey(digestPublicKey.point.add(destinationPublicKey.point)) // H(ebG)G + bG
    return { stealthPublicKey, digest }
  }

  constructHDStealthPublicKey (emphemeralPrivKey, destinationPublicKey) {
    const { stealthPublicKey, digest } = this.constructStealthPublicKey(emphemeralPrivKey, destinationPublicKey)
    return new HDPublicKey({
      publicKey: stealthPublicKey.toBuffer(),
      depth: 0,
      network: this.networkName,
      childIndex: 0,
      chainCode: digest,
      parentFingerPrint: 0
    })
  }

  constructStealthPrivateKey (emphemeralPubKey, destinationPrivateKey) {
    const dhKeyPoint = emphemeralPubKey.point.mul(destinationPrivateKey.bn) // ebG
    const dhKeyPointRaw = crypto.Point.pointToCompressed(dhKeyPoint)

    const digest = crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
    const digestBn = crypto.BN.fromBuffer(digest)

    const stealthPrivBn = digestBn.add(destinationPrivateKey.bn).mod(crypto.Point.getN()) // H(ebG) + b
    const stealthPrivateKey = PrivateKey(stealthPrivBn)
    return { stealthPrivateKey, digest }
  }

  constructHDStealthPrivateKey (emphemeralPubKey, destinationPrivateKey) {
    const { stealthPrivateKey, digest } = this.constructStealthPrivateKey(emphemeralPubKey, destinationPrivateKey)
    return new HDPrivateKey({
      privateKey: stealthPrivateKey.toBuffer(),
      depth: 0,
      network: this.networkName,
      childIndex: 0,
      chainCode: digest,
      parentFingerPrint: 0
    })
  }

  constructStampPublicKey (payloadDigest, destinationPublicKey) {
    const digestPrivateKey = PrivateKey.fromBuffer(payloadDigest)
    const digestPublicKey = digestPrivateKey.toPublicKey()
    const stampPoint = digestPublicKey.point.add(destinationPublicKey.point)
    const stampPublicKey = PublicKey.fromPoint(stampPoint)
    return stampPublicKey
  }

  constructStampHDPublicKey (payloadDigest, destinationPublicKey) {
    const stampPublicKey = this.constructStampPublicKey(payloadDigest, destinationPublicKey)
    return new HDPublicKey({
      publicKey: stampPublicKey.toBuffer(),
      depth: 0,
      network: this.networkName,
      childIndex: 0,
      chainCode: payloadDigest,
      parentFingerPrint: 0
    })
  }

  constructStampPrivateKey (payloadDigest, destinationPrivateKey) {
    const digestBn = crypto.BN.fromBuffer(payloadDigest)
    const stampPrivBn = digestBn.add(destinationPrivateKey.bn).mod(crypto.Point.getN())
    const stampPrivKey = PrivateKey(stampPrivBn)
    return stampPrivKey
  }

  constructStampHDPrivateKey (payloadDigest, destinationPrivateKey) {
    const stampPrivateKey = this.constructStampPrivateKey(payloadDigest, destinationPrivateKey)
    return new HDPrivateKey({
      privateKey: stampPrivateKey.toBuffer(),
      depth: 0,
      network: this.networkName,
      childIndex: 0,
      chainCode: payloadDigest,
      parentFingerPrint: 0
    })
  }

  constructStampAddress (outpointDigest, privKey) {
    const digestBn = crypto.BN.fromBuffer(outpointDigest)
    const stampPrivBn = privKey.bn.add(digestBn).mod(crypto.Point.getN())
    const stampAddress = PrivateKey(stampPrivBn).toAddress(this.networkName)
    return stampAddress
  }

  encrypt (sharedKey, plainText) {
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

  decrypt (sharedKey, cipherText) {
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
}
