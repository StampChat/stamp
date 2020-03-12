import axios from 'axios'
import addressmetadata from './addressmetadata_pb'
import pop from '../pop/index'

const cashlib = require('bitcore-lib-cash')

class KeyserverHandler {
  trustedServers = ['http://34.67.137.105:8080']
  constructor (defaultSampleSize, keyservers) {
    this.keyservers = keyservers || this.trustedServers
    this.defaultSampleSize = defaultSampleSize || 3
  }

  static constructRelayUrlMetadata (relayUrl, privKey) {
    let relayUrlEntry = new addressmetadata.Entry()
    relayUrlEntry.setKind('relay-server')
    const rawRelayUrl = new TextEncoder().encode(relayUrl)
    relayUrlEntry.setEntryData(rawRelayUrl)

    // Construct payload
    let payload = new addressmetadata.Payload()
    payload.setTimestamp(Math.floor(Date.now() / 1000))
    payload.setTtl(31556952) // 1 year
    payload.addEntries(relayUrlEntry)

    let serializedPayload = payload.serializeBinary()
    let hashbuf = cashlib.crypto.Hash.sha256(serializedPayload)
    let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    let metadata = new addressmetadata.AddressMetadata()
    let sig = ecdsa.sig.toCompact(1).slice(1)
    metadata.setPubKey(privKey.toPublicKey().toBuffer())
    metadata.setSignature(sig)
    metadata.setScheme(1)
    metadata.setSerializedPayload(serializedPayload)

    return metadata
  }

  static async fetchMetadata (keyserver, addr) {
    let url = `${keyserver}/keys/${addr}`
    let response = await axios(
      {
        method: 'get',
        url: url,
        responseType: 'arraybuffer'
      }
    )
    if (response.status === 200) {
      let metadata = addressmetadata.AddressMetadata.deserializeBinary(response.data)
      return metadata
    }
  }

  chooseServer () {
    // TODO: Sample correctly
    return this.keyservers[0]
  }

  static async paymentRequest (serverUrl, addr) {
    let url = `${serverUrl}/keys/${addr.toLegacyAddress()}`
    return pop.getPaymentRequest(url, 'put')
  }

  async uniformSample (addr) {
    // TODO: Sample correctly
    let server = this.chooseServer()
    return KeyserverHandler.fetchMetadata(server, addr)
  }

  async getRelayUrl (addr) {
    // Get metadata
    let metadata = await this.uniformSample(addr)
    let payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

    // Find vCard
    function isRelay (entry) {
      return entry.getKind() === 'relay-server'
    }
    let entryList = payload.getEntriesList()
    let entry = entryList.find(isRelay)
    if (!entry) {
      return undefined
    }
    let entryData = entry.getEntryData()
    let relayUrl = new TextDecoder().decode(entryData)
    return relayUrl
  }

  static async putMetadata (addr, server, metadata, token) {
    let rawMetadata = metadata.serializeBinary()
    let url = `${server}/keys/${addr.toLegacyAddress()}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        'Authorization': token
      },
      data: rawMetadata
    })
  }
}

export default KeyserverHandler
