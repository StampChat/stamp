import assert from 'assert'
import axios from 'axios'
import { Address, crypto, Networks, PrivateKey } from 'bitcore-lib-xpi'
import { URL } from 'url'
import { TextDecoder, TextEncoder } from 'util'
import { AuthWrapper } from '../auth_wrapper/wrapper_pb'
import pop from '../pop'
import { Outpoint } from '../types/outpoint'
import { validateBinary } from '../utils'
import { Wallet } from '../wallet'
import { calcId } from '../wallet/helpers'
import { AddressMetadata, Entry } from './keyserver_pb'

export class KeyserverHandler {
  keyservers: string[]
  networkName: string
  defaultSampleSize: number
  wallet?: Wallet

  constructor ({ wallet, defaultSampleSize = 3, keyservers, networkName }: { wallet?: Wallet, defaultSampleSize?: number, keyservers: string[], networkName: string }) {
    assert(networkName, 'Missing networkName while initializing KeyserverHandler')
    assert(keyservers, 'Missing keyservers while initializing KeyserverHandler')
    this.keyservers = keyservers
    this.networkName = networkName
    this.defaultSampleSize = defaultSampleSize
    this.wallet = wallet
  }

  toAPIAddressString (address: string) {
    return new Address(new Address(address).hashBuffer, Networks.get(this.networkName, undefined)).toCashAddress()
  }

  constructRelayUrlMetadata (relayUrl: string, privKey: PrivateKey) {
    const relayUrlEntry = new Entry()
    relayUrlEntry.setKind('relay-server')
    const rawRelayUrl = new TextEncoder().encode(relayUrl)
    relayUrlEntry.setBody(rawRelayUrl)

    // Construct payload
    const metadata = new AddressMetadata()
    metadata.setTimestamp(Math.floor(Date.now() / 1000))
    metadata.setTtl(31556952) // 1 year
    metadata.addEntries(relayUrlEntry)

    const serializedPayload = metadata.serializeBinary()
    const hashbuf = crypto.Hash.sha256(Buffer.from(serializedPayload))
    const signature = crypto.ECDSA.sign(hashbuf, privKey)

    const authWrapper = new AuthWrapper()
    const sig = signature.toCompact(1, true).slice(1)
    authWrapper.setPublicKey(privKey.toPublicKey().toBuffer())
    authWrapper.setSignature(sig)
    authWrapper.setScheme(1)
    authWrapper.setPayload(serializedPayload)

    return authWrapper
  }

  async fetchMetadata (keyserver: string, address: string) {
    const legacyAddress = this.toAPIAddressString(address)
    const url = `${keyserver}/keys/${legacyAddress}`
    const response = await axios(
      {
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      }
    )

    assert(validateBinary(response.data), 'invalid type for legacy address payload')
    
    if (response.status === 200) {
      const metadata = AuthWrapper.deserializeBinary(response.data)
      return metadata
    }
  }

  chooseServer () {
    // TODO: Sample correctly
    return this.keyservers[0]
  }

  async paymentRequest (serverUrl: string, address: string, truncatedAuthWrapper: AuthWrapper) {
    const legacyAddress = this.toAPIAddressString(address)
    const rawAuthWrapper = truncatedAuthWrapper.serializeBinary()
    const url = `${serverUrl}/keys/${legacyAddress}`
    return pop.getPaymentRequest(url, 'put', rawAuthWrapper)
  }

  async _uniformSample (address: string) {
    // TODO: Sample correctly
    const server = this.chooseServer()
    return this.fetchMetadata(server, address)
  }

  async getRelayUrl (address: string) {
    const legacyAddress = this.toAPIAddressString(address)

    // Get metadata
    const metadata = await this._uniformSample(legacyAddress)
    assert(metadata, 'Missing metadata from keyserver')
    const rawAddressMetadata = metadata.getPayload()
    assert(typeof rawAddressMetadata !== 'string', 'rawAddressMetadata is a string?')
    const payload = AddressMetadata.deserializeBinary(rawAddressMetadata)

    // Find vCard
    function isRelay (entry: Entry) {
      return entry.getKind() === 'relay-server'
    }
    const entryList = payload.getEntriesList()
    const entry = entryList.find(isRelay)
    if (!entry) {
      return null
    }
    const entryData = entry.getBody()
    assert(typeof entryData !== 'string', 'entryData is a string')
    const relayUrl = new TextDecoder().decode(entryData)
    return relayUrl
  }

  async putMetadata (address: string, server: string, metadata: AuthWrapper, token: string) {
    const rawMetadata = metadata.serializeBinary()
    const url = `${server}/keys/${address}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        Authorization: token
      },
      data: rawMetadata
    })
  }

  async updateKeyMetadata (relayUrl: string, idPrivKey: PrivateKey) {
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')
    const idAddress = idPrivKey.toAddress(this.networkName).toCashAddress()
    // Construct metadata
    const authWrapper = this.constructRelayUrlMetadata(relayUrl, idPrivKey)

    const serverUrl = this.chooseServer()
    const payloadRaw = authWrapper.getPayload()
    assert(typeof payloadRaw !== 'string', 'payloadRaw is a string?')
    const payload = Buffer.from(payloadRaw)
    const payloadDigest = crypto.Hash.sha256(payload)
    const truncatedAuthWrapper = new AuthWrapper()
    const publicKey = authWrapper.getPublicKey()
    assert(typeof publicKey !== 'string', 'publicKey is a string?')

    truncatedAuthWrapper.setPublicKey(publicKey)
    const payloadBuf = payloadDigest.buffer
    truncatedAuthWrapper.setPayloadDigest(new Uint8Array(payloadBuf))

    const { paymentDetails } = await this.paymentRequest(serverUrl, idAddress, truncatedAuthWrapper) ?? { paymentDetails: undefined }
    assert(paymentDetails, 'Missing payment details')
    // Construct payment
    const { paymentUrl, payment, usedUtxos } = await pop.constructPaymentTransaction(this.wallet, paymentDetails)

    const paymentUrlFull = new URL(paymentUrl, serverUrl)
    const { token } = await pop.sendPayment(paymentUrlFull.href, payment)
    await Promise.all(usedUtxos.map((id: Outpoint) => this.wallet?.storage.deleteOutpoint(calcId(id))))

    await this.putMetadata(idAddress, serverUrl, authWrapper, token)
  }
}
