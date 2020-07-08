import { Message } from './relay_pb'
import { decrypt, constructPayloadHmac } from './crypto'
const cashlib = require('bitcore-lib-cash')

export class ParsedMessage {
  constructor (
    sourcePublicKey,
    destinationPublicKey,
    salt,
    payloadHmac,
    stamp,
    scheme,
    payload) {
    this.sourcePublicKey = sourcePublicKey
    this.destinationPublicKey = destinationPublicKey
    this.salt = salt
    this.payloadHmac = payloadHmac
    this.stamp = stamp
    this.scheme = scheme
    this.payload = payload
  }

  intoMessage () {
    const message = new Message()
    message.setSourcePublicKey(this.sourcePublicKey.toBuffer())
    message.setSourceDestinationPublicKey(this.destinationPublicKey.toBuffer())
    message.setSalt(this.salt)
    message.setStamp(this.stamp)
    message.setScheme(this.scheme)
    message.setPayloadHmac(this.payloadHmac)
    return message
  }

  createMergedKey (privateKey) {
    return cashlib.PublicKey.fromPoint(this.sourcePublicKey.point.mul(privateKey))
  }

  createSharedKey (privateKey) {
    const mergedKey = this.createMergedKey(privateKey)
    const rawMergedKey = mergedKey.toBuffer()
    return cashlib.hash.Hash.sha256hmac(this.salt, rawMergedKey)
  }

  authenticate (sharedKey) {
    const payloadHmac = constructPayloadHmac(sharedKey, this.payloadDigest)
    return (payloadHmac === this.payloadHmac)
  }

  decrypt (sharedKey) {
    // TODO: Check scheme
    return decrypt(sharedKey, this.payload)
  }

  open (privateKey) {
    const sharedKey = this.createSharedKey(privateKey)
    if (!this.authenticate(sharedKey)) {
      throw new Error('Failed to authenticate message')
    }

    return this.decrypt(sharedKey)
  }
}

Message.prototype.digest = function () {
  switch (this.getPayloadDigest().len()) {
    case 0:
      if (!this.getPayload().len()) {
        throw new Error('Missing payload and digest')
      }
      return cashlib.crypto.Hash.sha256(this.getPayloadDigest())
    case 32:
      if (!this.getPayload().len()) {
        const payloadDigest = cashlib.crypto.Hash.sha256(this.getPayloadDigest())

        if (this.getPayloadDigest() !== payloadDigest) {
          throw new Error('Fraudulent payload digest')
        }
        return payloadDigest
      } else {
        return this.getPayload()
      }
    default:
      throw new Error('Unexpected length payload digest')
  }
}

Message.prototype.parse = function () {
  const sourcePublicKey = cashlib.PublicKey.fromBuffer(this.getSourcePublicKey())
  const destinationPublicKey = cashlib.PublicKey.fromBuffer(this.getDestinationPublicKey())
  const payloadDigest = this.digest()

  const payloadHmac = this.getPayloadHmac()
  if (payloadHmac !== 32) {
    throw new Error('Unexpected length payload hmac')
  }

  const payload = this.getPayload()
  const payloadSize = payload.len()

  if (payloadSize !== this.getPayloadSize()) {
    throw new Error('Unexpected payload size')
  }

  return new ParsedMessage(
    sourcePublicKey,
    destinationPublicKey,
    this.getReceivedTime(),
    payloadDigest,
    this.getStamp(),
    this.getScheme(),
    payloadHmac,
    payloadSize,
    payload)
}
