import axios from 'axios'
import addressmetadata from './addressmetadata_pb'
import wrapper from '../pop/wrapper_pb'
import pop from '../pop/index'

const cashlib = require('bitcore-lib-cash')

class KeyserverHandler {
  trustedServers = ['http://34.68.170.199:8533']
  constructor (defaultSampleSize, keyservers) {
    this.keyservers = keyservers || this.trustedServers
    this.defaultSampleSize = defaultSampleSize || 3
  }

  static constructRelayUrlMetadata (relayUrl, privKey) {
    const relayUrlEntry = new addressmetadata.Entry()
    relayUrlEntry.setKind('relay-server')
    const rawRelayUrl = new TextEncoder().encode(relayUrl)
    relayUrlEntry.setEntryData(rawRelayUrl)

    // Construct payload
    const payload = new addressmetadata.Payload()
    payload.setTimestamp(Math.floor(Date.now() / 1000))
    payload.setTtl(31556952) // 1 year
    payload.addEntries(relayUrlEntry)

    const serializedPayload = payload.serializeBinary()
    const hashbuf = cashlib.crypto.Hash.sha256(serializedPayload)
    const ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    const metadata = new wrapper.AuthWrapper()
    const sig = ecdsa.sig.toCompact(1).slice(1)
    metadata.setPubKey(privKey.toPublicKey().toBuffer())
    metadata.setSignature(sig)
    metadata.setScheme(1)
    metadata.setSerializedPayload(serializedPayload)

    return metadata
  }

  static async fetchMetadata (keyserver, addr) {
    const url = `${keyserver}/keys/${addr}`
    const response = await axios(
      {
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      }
    )
    if (response.status === 200) {
      const metadata = wrapper.AuthWrapper.deserializeBinary(response.data)
      return metadata
    }
  }

  chooseServer () {
    // TODO: Sample correctly
    return this.keyservers[0]
  }

  static async paymentRequest (serverUrl, addr) {
    const url = `${serverUrl}/keys/${addr.toLegacyAddress()}`
    return await pop.getPaymentRequest(url, 'put')
  }

  async uniformSample (addr) {
    // TODO: Sample correctly
    const server = this.chooseServer()
    return KeyserverHandler.fetchMetadata(server, addr)
  }

  async getRelayUrl (addr) {
    // Get metadata
    const metadata = await this.uniformSample(addr)
    const payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

    // Find vCard
    function isRelay (entry) {
      return entry.getKind() === 'relay-server'
    }
    const entryList = payload.getEntriesList()
    const entry = entryList.find(isRelay)
    if (!entry) {
      return null
    }
    const entryData = entry.getEntryData()
    const relayUrl = new TextDecoder().decode(entryData)
    return relayUrl
  }

  static async putMetadata (addr, server, metadata, token) {
    const rawMetadata = metadata.serializeBinary()
    const url = `${server}/keys/${addr.toLegacyAddress()}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        Authorization: token
      },
      data: rawMetadata
    })
  }
}

export default KeyserverHandler
