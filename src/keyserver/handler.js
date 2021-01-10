import axios from 'axios'
import { Entry, AddressMetadata } from './keyserver_pb'
import { AuthWrapper } from '../auth_wrapper/wrapper_pb'
import pop from '../pop'
import { trustedKeyservers, networkName } from '../utils/constants'
import { crypto } from 'bitcore-lib-cash'

class KeyserverHandler {
  constructor ({ wallet, defaultSampleSize = 3, keyservers = trustedKeyservers } = {}) {
    this.keyservers = keyservers
    this.defaultSampleSize = defaultSampleSize
    this.wallet = wallet
  }

  static constructRelayUrlMetadata (relayUrl, privKey) {
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

  static async fetchMetadata (keyserver, address) {
    const url = `${keyserver}/keys/${address}`
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

  static async paymentRequest (serverUrl, address, truncatedAuthWrapper) {
    const rawAuthWrapper = truncatedAuthWrapper.serializeBinary()
    const url = `${serverUrl}/keys/${address}`
    return pop.getPaymentRequest(url, 'put', rawAuthWrapper)
  }

  async uniformSample (address) {
    // TODO: Sample correctly
    const server = this.chooseServer()
    return KeyserverHandler.fetchMetadata(server, address)
  }

  async getRelayUrl (address) {
    // Get metadata
    const metadata = await this.uniformSample(address)
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

  static async putMetadata (address, server, metadata, token) {
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
    const idAddress = idPrivKey.toAddress(networkName).toLegacyAddress().toString()
    // Construct metadata
    const authWrapper = KeyserverHandler.constructRelayUrlMetadata(relayUrl, idPrivKey)

    const serverUrl = this.chooseServer()
    // Truncate metadata
    const payload = Buffer.from(authWrapper.getPayload())
    const payloadDigest = crypto.Hash.sha256(payload)
    const truncatedAuthWrapper = new AuthWrapper()
    const publicKey = authWrapper.getPublicKey()
    truncatedAuthWrapper.setPublicKey(publicKey)
    truncatedAuthWrapper.setPayloadDigest(payloadDigest)

    const { paymentDetails } = await KeyserverHandler.paymentRequest(serverUrl, idAddress, truncatedAuthWrapper)

    // Construct payment
    const { paymentUrl, payment, usedIDs } = await pop.constructPaymentTransaction(this.wallet, paymentDetails)

    const paymentUrlFull = new URL(paymentUrl, serverUrl)
    const { token } = await pop.sendPayment(paymentUrlFull.href, payment)
    await Promise.all(usedIDs.map(id => this.wallet.storage.deleteOutpoint(id)))

    await KeyserverHandler.putMetadata(idAddress, serverUrl, authWrapper, token)
  }
}

export default KeyserverHandler
