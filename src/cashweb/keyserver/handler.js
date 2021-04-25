import axios from 'axios'
import assert from 'assert'

import { Entry, AddressMetadata } from './keyserver_pb'
import { AuthWrapper } from '../auth_wrapper/wrapper_pb'
import pop from '../pop'
import { crypto, Address, Networks } from 'bitcore-lib-cash'

export class KeyserverHandler {
  constructor ({ wallet = undefined, defaultSampleSize = 3, keyservers, networkName } = {}) {
    assert(networkName, 'Missing networkName while initializing KeyserverHandler')
    assert(keyservers, 'Missing keyservers while initializing KeyserverHandler')
    this.keyservers = keyservers
    this.networkName = networkName
    this.defaultSampleSize = defaultSampleSize
    this.wallet = wallet
  }

  toAPIAddressString (address) {
    return new Address(new Address(address).hashBuffer, Networks.get(this.networkName, undefined)).toCashAddress()
  }

  constructRelayUrlMetadata (relayUrl, privKey) {
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
    const hashbuf = crypto.Hash.sha256(serializedPayload)
    const ecdsa = crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    const authWrapper = new AuthWrapper()
    const sig = ecdsa.sig.toCompact(1).slice(1)
    authWrapper.setPublicKey(privKey.toPublicKey().toBuffer())
    authWrapper.setSignature(sig)
    authWrapper.setScheme(1)
    authWrapper.setPayload(serializedPayload)

    return authWrapper
  }

  async fetchMetadata (keyserver, address) {
    const legacyAddress = this.toAPIAddressString(address)
    const url = `${keyserver}/keys/${legacyAddress}`
    const response = await axios(
      {
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      }
    )
    if (response.status === 200) {
      const metadata = AuthWrapper.deserializeBinary(response.data)
      return metadata
    }
  }

  chooseServer () {
    // TODO: Sample correctly
    return this.keyservers[0]
  }

  async paymentRequest (serverUrl, address, truncatedAuthWrapper) {
    const legacyAddress = this.toAPIAddressString(address)

    const rawAuthWrapper = truncatedAuthWrapper.serializeBinary()
    const url = `${serverUrl}/keys/${legacyAddress}`
    return pop.getPaymentRequest(url, 'put', rawAuthWrapper)
  }

  async _uniformSample (address) {
    // TODO: Sample correctly
    const server = this.chooseServer()
    return this.fetchMetadata(server, address)
  }

  async getRelayUrl (address) {
    const legacyAddress = this.toAPIAddressString(address)

    // Get metadata
    const metadata = await this._uniformSample(legacyAddress)
    const payload = AddressMetadata.deserializeBinary(metadata.getPayload())

    // Find vCard
    function isRelay (entry) {
      return entry.getKind() === 'relay-server'
    }
    const entryList = payload.getEntriesList()
    const entry = entryList.find(isRelay)
    if (!entry) {
      return null
    }
    const entryData = entry.getBody()
    const relayUrl = new TextDecoder().decode(entryData)
    return relayUrl
  }

  async putMetadata (address, server, metadata, token) {
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

  async updateKeyMetadata (relayUrl, idPrivKey) {
    assert(this.wallet, 'Missing wallet while running updateKeyMetadata')
    const idAddress = idPrivKey.toAddress(this.networkName).toCashAddress()
    // Construct metadata
    const authWrapper = this.constructRelayUrlMetadata(relayUrl, idPrivKey)

    const serverUrl = this.chooseServer()
    // Truncate metadata
    const payload = Buffer.from(authWrapper.getPayload())
    const payloadDigest = crypto.Hash.sha256(payload)
    const truncatedAuthWrapper = new AuthWrapper()
    const publicKey = authWrapper.getPublicKey()
    truncatedAuthWrapper.setPublicKey(publicKey)
    truncatedAuthWrapper.setPayloadDigest(payloadDigest)

    const { paymentDetails } = await this.paymentRequest(serverUrl, idAddress, truncatedAuthWrapper)

    // Construct payment
    const { paymentUrl, payment, usedIDs } = await pop.constructPaymentTransaction(this.wallet, paymentDetails)

    const paymentUrlFull = new URL(paymentUrl, serverUrl)
    const { token } = await pop.sendPayment(paymentUrlFull.href, payment)
    await Promise.all(usedIDs.map(id => this.wallet.storage.deleteOutpoint(id)))

    await this.putMetadata(idAddress, serverUrl, authWrapper, token)
  }
}
