import axios from 'axios'
import addressmetadata from './addressmetadata_pb'
import paymentrequest from './paymentrequest_pb'

class Handler {
  trustedServers = ['http://34.67.137.105']
  constructor (defaultSampleSize, keyservers) {
    this.keyservers = keyservers || this.trustedServers
    this.defaultSampleSize = defaultSampleSize || 3
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
        let metadata = paymentrequest.PaymentRequest.deserializeBinary(response.data)
        return { metadata, server }
      }
    }
  }
}

export default {
  Handler
}
