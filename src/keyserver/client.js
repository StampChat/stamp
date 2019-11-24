import axios from 'axios'
import addressmetadata from './addressmetadata_pb'
import paymentrequest from './paymentrequest_pb'
import VCard from 'vcf'

const cashlib = require('bitcore-lib-cash')

class Handler {
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

    let cardEntry = addressmetadata.Entry({
      kind: 'vcard',
      entry_data: rawCard
    })

    // Construct avatar
    let imgEntry = addressmetadata.Entry({
      kind: 'avatar',
      entry_data: profile.avatar
    })

    // Construct payload
    let time = Math.floor(Date.now() / 1000)
    let ttl = 31556952 // 1 year
    let entries = [cardEntry, imgEntry]
    let payload = addressmetadata.Payload({
      time,
      ttl,
      entries
    })

    let serializedPayload = payload.serializeBinary()
    let hashbuf = cashlib.Hash.sha256(serializedPayload)
    let ecdsa = cashlib.ECDSA({ privKey, hashbuf })
    let sig = ecdsa.sign()

    let metadata = cashlib.AddressMetadata({
      pub_key: privKey.toPublicKey().toBuffer(),
      signature: sig.toBuffer(),
      scheme: 'ECDSA',
      serializedPayload
    })
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
    return Handler.fetchMetadata(server, addr)
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

  static async sendPayment (addr, server, payment) {
    let rawPayment = payment.serializeBinary()
    let url = `${server}/keys/${addr.toLegacyAddress()}`
    let response = await axios({
      method: 'post',
      url: url,
      responseType: 'arrayBuffer',
      data: rawPayment
    })
    console.log(response)
    let token = response.headers['Authorization']
    let paymentReceipt = response.data
    return { paymentReceipt, token }
  }

  static async putMetadata (addr, server, metadata, token) {
    let rawMetadata = metadata.serializeBinary()
    let url = `${server}/keys/${addr.toLegacyAddress()}`
    let response = await axios({
      method: 'post',
      url: url,
      headers: {
        'Authorization': token
      },
      responseType: 'arrayBuffer',
      data: rawMetadata
    })
    console.log(response)
  }
}

export default {
  Handler
}
