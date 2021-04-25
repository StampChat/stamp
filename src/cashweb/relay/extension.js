import { Message } from './relay_pb'
import { PayloadConstructor } from './crypto'
import { crypto, PublicKey } from 'bitcore-lib-cash'

export class ParsedMessage {
  constructor (
    sourcePublicKey,
    destinationPublicKey,
    receivedTime,
    salt,
    stamp,
    scheme,
    payloadDigest,
    payloadHmac,
    payloadSize,
    payload,
    networkName) {
    this.sourcePublicKey = sourcePublicKey
    this.destinationPublicKey = destinationPublicKey
    this.receivedTime = receivedTime
    this.salt = salt
    this.stamp = stamp
    this.scheme = scheme
    this.payloadDigest = payloadDigest
    this.payloadHmac = payloadHmac
    this.payloadSize = payloadSize
    this.payload = payload
    this.payloadConstructor = new PayloadConstructor({ networkName })
  }

  intoMessage () {
    const message = new Message()
    message.setSourcePublicKey(this.sourcePublicKey.toBuffer())
    message.setSourceDestinationPublicKey(this.destinationPublicKey.toBuffer())
    message.setSalt(this.salt)
    message.setStamp(this.stamp)
    message.setScheme(this.scheme)
    message.setPayloadHmac(this.payloadHmac)
    message.setPayload(this.payload)
    return message
  }

  constructSharedKey (privateKey) {
    return this.payloadConstructor.constructSharedKey(privateKey, this.sourcePublicKey, this.salt)
  }

  constructSharedKeySelf (privateKey) {
    return this.payloadConstructor.constructSharedKey(privateKey, this.destinationPublicKey, this.salt)
  }

  authenticate (sharedKey) {
    const payloadHmac = this.payloadConstructor.constructPayloadHmac(sharedKey, this.payloadDigest)
    return (this.payloadHmac.every((value, index) => value === payloadHmac[index]))
  }

  decrypt (sharedKey) {
    // TODO: Check scheme
    return this.payloadConstructor.decrypt(sharedKey, this.payload)
  }

  open (privateKey) {
    const sharedKey = this.constructSharedKey(privateKey)
    if (!this.authenticate(sharedKey)) {
      throw new Error('Failed to authenticate message')
    }

    return this.decrypt(sharedKey)
  }

  openSelf (privateKey) {
    const sharedKey = this.constructSharedKeySelf(privateKey)
    if (!this.authenticate(sharedKey)) {
      throw new Error('Failed to authenticate message')
    }

    return this.decrypt(sharedKey)
  }
}

export const messageMixin = (networkPrefix) => ({
  digest () {
    const payloadDigest = this.getPayloadDigest()
    const payload = this.getPayload()
    const payloadBuffer = Buffer.from(payload)
    switch (payloadDigest.length) {
      case 0:
        if (!payload.length) {
          throw new Error('Missing payload and digest')
        }
        return crypto.Hash.sha256(payloadBuffer)
      case 32:
        if (payload.length) {
          const computedPayloadDigest = crypto.Hash.sha256(payloadBuffer)
          const computedDigest = Buffer.from(computedPayloadDigest)
          if (computedDigest.compare(payloadDigest) !== 0) {
            throw new Error(`Fraudulent payload digest: ${payloadDigest} !== ${computedDigest}`)
          }
        }
        return payloadDigest
      default:
        throw new Error('Unexpected length payload digest')
    }
  },
  parse () {
    const sourcePublicKey = PublicKey.fromBuffer(this.getSourcePublicKey())
    const destinationPublicKey = PublicKey.fromBuffer(this.getDestinationPublicKey())
    const payloadDigest = this.digest()

    const payloadHmac = this.getPayloadHmac()
    if (payloadHmac.length !== 32) {
      throw new Error('Unexpected length payload hmac')
    }

    const payload = this.getPayload()
    const payloadSize = payload.length
    const reportedPayloadSize = this.getPayloadSize()
    if (reportedPayloadSize !== 0 && reportedPayloadSize !== payloadSize) {
      throw new Error('Unexpected payload size')
    }

    return new ParsedMessage(
      sourcePublicKey,
      destinationPublicKey,
      this.getReceivedTime(),
      this.getSalt(),
      this.getStamp(),
      this.getScheme(),
      payloadDigest,
      payloadHmac,
      payloadSize,
      payload,
      networkPrefix)
  }
})
