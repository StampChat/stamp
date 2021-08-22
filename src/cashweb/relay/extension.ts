import { Message, Stamp } from './relay_pb'
import { PayloadConstructor } from './crypto'
import { crypto, PrivateKey, PublicKey } from 'bitcore-lib-xpi'
import assert from 'assert'

export class ParsedMessage {
  sourcePublicKey: PublicKey
  destinationPublicKey: PublicKey
  receivedTime: number
  salt: Uint8Array
  stamp: Stamp
  scheme: Message.EncryptionSchemeMap
  payloadDigest: Uint8Array
  payloadHmac: Uint8Array
  payloadSize: number
  payload: Uint8Array
  payloadConstructor: PayloadConstructor

  constructor (
    sourcePublicKey: PublicKey,
    destinationPublicKey: PublicKey,
    receivedTime: number,
    salt: Uint8Array,
    stamp: Stamp,
    scheme: Message.EncryptionSchemeMap,
    payloadDigest: Uint8Array,
    payloadHmac: Uint8Array,
    payloadSize: number,
    payload: Uint8Array,
    networkName: string
  ) {
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

  constructSharedKey (privateKey: PrivateKey) {
    return this.payloadConstructor.constructSharedKey(privateKey, this.sourcePublicKey, this.salt)
  }

  constructSharedKeySelf (privateKey: PrivateKey) {
    return this.payloadConstructor.constructSharedKey(privateKey, this.destinationPublicKey, this.salt)
  }

  authenticate (sharedKey: Buffer) {
    const payloadHmac = this.payloadConstructor.constructPayloadHmac(sharedKey, this.payloadDigest)
    return (this.payloadHmac.every((value, index) => value === payloadHmac[index]))
  }

  decrypt (sharedKey: Buffer) {
    // TODO: Check scheme
    return this.payloadConstructor.decrypt(sharedKey, this.payload)
  }

  open (privateKey: PrivateKey) {
    const sharedKey = this.constructSharedKey(privateKey)
    if (!this.authenticate(sharedKey)) {
      throw new Error('Failed to authenticate message')
    }

    return this.decrypt(sharedKey)
  }

  openSelf (privateKey: PrivateKey) {
    const sharedKey = this.constructSharedKeySelf(privateKey)
    if (!this.authenticate(sharedKey)) {
      throw new Error('Failed to authenticate message')
    }

    return this.decrypt(sharedKey)
  }
}

interface ExtendedMessage {
  digest (): string | Uint8Array | Buffer
  parse (): ParsedMessage
}

export function messageMixin (networkPrefix: string, message: Message): Message & ExtendedMessage {
  return Object.assign(message, {
    digest () {
      const payloadDigest = message.getPayloadDigest()
      const payload = message.getPayload()
      const payloadBuffer = Buffer.from(payload)
      switch (payloadDigest.length) {
        case 0:
          if (!payload.length) {
            throw new Error('Missing payload and digest')
          }
          return crypto.Hash.sha256(payloadBuffer)
        case 32:
          assert(typeof payloadDigest !== 'string')
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
      const sourcePublicKey = new PublicKey(Buffer.from(message.getSourcePublicKey()))
      const destinationPublicKey = new PublicKey(Buffer.from(message.getDestinationPublicKey()))
      const payloadDigest = this.digest()

      const payloadHmac = message.getPayloadHmac()
      assert(typeof payloadHmac !== 'string')
      if (payloadHmac.length !== 32) {
        throw new Error('Unexpected length payload hmac')
      }

      const payload = message.getPayload()
      assert(typeof payload !== 'string')
      const payloadSize = payload.length
      const reportedPayloadSize = message.getPayloadSize()
      if (reportedPayloadSize !== 0 && reportedPayloadSize !== payloadSize) {
        throw new Error('Unexpected payload size')
      }
      const salt = message.getSalt()
      assert(typeof salt !== 'string')
      const stamp = message.getStamp()
      assert(stamp)
      const encryptionScheme: Message.EncryptionSchemeMap = (message.getScheme() as unknown) as Message.EncryptionSchemeMap

      return new ParsedMessage(
        sourcePublicKey,
        destinationPublicKey,
        message.getReceivedTime(),
        salt,
        stamp,
        encryptionScheme,
        payloadDigest,
        payloadHmac,
        payloadSize,
        payload,
        networkPrefix)
    }
  })
}
