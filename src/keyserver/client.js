import axios from 'axios'
import addressmetadata from './addressmetadata_pb'

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

    async uniformSample (addr) {
      // TODO: Sample
      return Handler.fetchMetadata(this.keyservers[0], addr)
    }
}

export default {
  Handler
}
