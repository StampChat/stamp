import assert from 'assert'
import { PrivateKey, PublicKey, crypto, HDPublicKey, HDPrivateKey } from 'bitcore-lib-xpi'
import * as forge from 'node-forge'

export class PayloadConstructor {
  networkName: string

  constructor ({ networkName }: { networkName: string }) {
    assert(networkName, 'Missing networkName while initializing PayloadConstructor')
    this.networkName = networkName
  }

  constructPayloadHmac (sharedKey: Buffer, payloadDigest: Uint8Array) {
    return crypto.Hash.sha256hmac(sharedKey, Buffer.from(payloadDigest))
  }

  constructMergedKey (privateKey: PrivateKey, publicKey: PublicKey) {
    return PublicKey.fromPoint(publicKey.point.mul(privateKey.toBigNumber()))
  }

  constructSharedKey (privateKey: PrivateKey, publicKey: PublicKey, salt: Uint8Array) {
    const mergedKey = this.constructMergedKey(privateKey, publicKey)
    const rawMergedKey = mergedKey.toBuffer()
    const sharedKey = crypto.Hash.sha256hmac(Buffer.from(salt), rawMergedKey)
    return sharedKey
  }

  constructStealthPublicKey (emphemeralPrivKey: PrivateKey, destinationPublicKey: PublicKey) {
    const dhKeyPoint = destinationPublicKey.point.mul(emphemeralPrivKey.bn) // ebG
    const dhKeyPointRaw = crypto.Point.pointToCompressed(dhKeyPoint)

    const digest = crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
    const digestPublicKey = PrivateKey.fromBuffer(digest, this.networkName).toPublicKey() // H(ebG)G

    const stealthPublicKey = PublicKey.fromPoint(digestPublicKey.point.add(destinationPublicKey.point)) // H(ebG)G + bG
    return { stealthPublicKey, digest }
  }

  constructHDStealthPublicKey (emphemeralPrivKey: PrivateKey, destinationPublicKey: PublicKey) {
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

  constructStealthPrivateKey (emphemeralPubKey: PublicKey, destinationPrivateKey: PrivateKey) {
    const dhKeyPoint = emphemeralPubKey.point.mul(destinationPrivateKey.bn) // ebG
    const dhKeyPointRaw = crypto.Point.pointToCompressed(dhKeyPoint)

    const digest = crypto.Hash.sha256(dhKeyPointRaw) // H(ebG)
    const digestBn = crypto.BN.fromBuffer(digest)

    const stealthPrivBn = digestBn.add(destinationPrivateKey.bn).mod(crypto.Point.getN()) // H(ebG) + b
    const stealthPrivateKey = new PrivateKey(stealthPrivBn)
    return { stealthPrivateKey, digest }
  }

  constructHDStealthPrivateKey (emphemeralPubKey: PublicKey, destinationPrivateKey: PrivateKey) {
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

  constructStampPublicKey (payloadDigest: Uint8Array, destinationPublicKey: PublicKey) {
    const digestPrivateKey = PrivateKey.fromBuffer(Buffer.from(payloadDigest), this.networkName)
    const digestPublicKey = digestPrivateKey.toPublicKey()
    const stampPoint = digestPublicKey.point.add(destinationPublicKey.point)
    const stampPublicKey = PublicKey.fromPoint(stampPoint)
    return stampPublicKey
  }

  constructStampHDPublicKey (payloadDigest: Uint8Array, destinationPublicKey: PublicKey) {
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

  constructStampPrivateKey (payloadDigest: Uint8Array, destinationPrivateKey: PrivateKey) {
    const digestBn = crypto.BN.fromBuffer(Buffer.from(payloadDigest))
    const stampPrivBn = digestBn.add(destinationPrivateKey.toBigNumber()).mod(crypto.Point.getN())
    const stampPrivKey = new PrivateKey(stampPrivBn)
    return stampPrivKey
  }

  constructStampHDPrivateKey (payloadDigest: Uint8Array, destinationPrivateKey: PrivateKey) {
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

  constructStampAddress (outpointDigest: Uint8Array, privKey: PrivateKey) {
    const digestBn = crypto.BN.fromBuffer(Buffer.from(outpointDigest))
    const stampPrivBn = privKey.toBigNumber().add(digestBn).mod(crypto.Point.getN())
    const stampAddress = new PrivateKey(stampPrivBn).toAddress(this.networkName)
    return stampAddress
  }

  encrypt (sharedKey: Buffer, plainText: Uint8Array) {
    // Split shared key
    const iv = forge.util.createBuffer(sharedKey.slice(0, 16))
    const key = forge.util.createBuffer(sharedKey.slice(16))

    // Encrypt entries
    const cipher = forge.cipher.createCipher('AES-CBC', key)
    cipher.start({ iv })
    const rawBuffer = forge.util.createBuffer(plainText)
    cipher.update(rawBuffer)
    cipher.finish()
    const cipherText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster

    return cipherText
  }

  decrypt (sharedKey: Buffer, cipherText: Uint8Array) {
    // Split shared key
    const iv = forge.util.createBuffer(sharedKey.slice(0, 16))
    const key = forge.util.createBuffer(sharedKey.slice(16))

    // Encrypt entries
    const cipher = forge.cipher.createDecipher('AES-CBC', key)
    cipher.start({ iv })
    const rawBuffer = forge.util.createBuffer(cipherText)
    cipher.update(rawBuffer)
    cipher.finish()
    const plainText = Uint8Array.from(Buffer.from(cipher.output.toHex(), 'hex')) // TODO: Faster
    return plainText
  }
}
