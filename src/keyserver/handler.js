import axios from 'axios'
import addressmetadata from './addressmetadata_pb'
import paymentrequest from './paymentrequest_pb'
import VCard from 'vcf'

const cashlib = require('bitcore-lib-cash')

class KeyserverHandler {
  trustedServers = ['http://34.67.137.105']
  constructor (defaultSampleSize, keyservers) {
    this.keyservers = keyservers || this.trustedServers
    this.defaultSampleSize = defaultSampleSize || 3
  }

  static constructProfileMetadata (profile, privKey) {
    // Construct vCard
    let vCard = new VCard()
    vCard.set('fn', profile.name)
    vCard.set('bio', profile.bio)
    let rawCard = new TextEncoder().encode(vCard.toString())

    let cardEntry = new addressmetadata.Entry()
    cardEntry.setKind('vcard')
    cardEntry.setEntryData(rawCard)

    // Construct avatar
    let imgEntry = new addressmetadata.Entry()
    imgEntry.setKind('avatar')
    let rawAvatar = new Uint8Array(profile.avatar)
    imgEntry.setEntryData(rawAvatar)

    // Construct payload
    let payload = new addressmetadata.Payload()
    payload.setTimestamp(Math.floor(Date.now() / 1000))
    payload.setTtl(31556952) // 1 year
    payload.addEntries(cardEntry)
    payload.addEntries(imgEntry)

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

  async uniformSample (addr) {
    // TODO: Sample correctly
    let server = this.chooseServer()
    return KeyserverHandler.fetchMetadata(server, addr)
  }

  async getPaymentRequest (addr) {
    // TODO: Sample correctly
    let server = this.chooseServer()

    let url = `${server}/keys/${addr.toLegacyAddress()}`

    try {
      await axios({
        method: 'put',
        url: url,
        responseType: 'arraybuffer'
      })
    } catch (err) {
      let response = err.response
      if (response.status === 402) {
        let paymentRequest = paymentrequest.PaymentRequest.deserializeBinary(response.data)
        let serializedPaymentDetails = paymentRequest.getSerializedPaymentDetails()
        let paymentDetails = paymentrequest.PaymentDetails.deserializeBinary(serializedPaymentDetails)
        return { paymentRequest, paymentDetails, server }
      }
    }
  }

  static async sendPayment (paymentUrl, payment) {
    var rawPayment = payment.serializeBinary()
    let response
    try {
      response = await axios({
        method: 'post',
        headers: {
          'Content-Type': 'application/bitcoincash-payment',
          'Accept': 'application/bitcoincash-paymentack'
        },
        url: paymentUrl,
        data: rawPayment
      })
    } catch (err) {
      console.log(err.response)
    }

    let token = response.headers['authorization']
    let paymentReceipt = response.data
    return { paymentReceipt, token }
  }

  static async putMetadata (addr, server, metadata, token) {
    let rawMetadata = metadata.serializeBinary()
    let url = `${server}/keys/${addr.toLegacyAddress()}`
    try {
      await axios({
        method: 'put',
        url: url,
        headers: {
          'Authorization': token
        },
        data: rawMetadata
      })
    } catch (err) {
      console.log(err.response)
    }
  }
}

export default KeyserverHandler
