import axios from 'axios'
import addressmetadata from './addressmetadata_pb'
import VCard from 'vcf'
import pop from '../pop/index'

const cashlib = require('bitcore-lib-cash')

class KeyserverHandler {
  trustedServers = ['http://34.67.137.105:8080']
  constructor (defaultSampleSize, keyservers) {
    this.keyservers = keyservers || this.trustedServers
    this.defaultSampleSize = defaultSampleSize || 3
  }

  static constructProfileMetadata (profile, privKey) {
    // Construct vCard
    let vCard = new VCard()
    vCard.set('fn', profile.name)
    vCard.set('note', profile.bio)
    let rawCard = new TextEncoder().encode(vCard.toString())

    let cardEntry = new addressmetadata.Entry()
    cardEntry.setKind('vcard')
    cardEntry.setEntryData(rawCard)

    // Construct avatar
    let imgEntry = new addressmetadata.Entry()
    imgEntry.setKind('avatar')

    let arr = profile.avatar.split(',')
    let avatarType = arr[0].match(/:(.*?);/)[1]
    let bstr = atob(arr[1])
    let n = bstr.length
    let rawAvatar = new Uint8Array(n)

    while (n--) {
      rawAvatar[n] = bstr.charCodeAt(n)
    }
    let imgHeader = new addressmetadata.Header()
    imgHeader.setName('data')
    imgHeader.setValue(avatarType)
    imgEntry.setEntryData(rawAvatar)
    imgEntry.addHeaders(imgHeader)

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

  static async paymentRequest (serverUrl, addr) {
    let url = `${serverUrl}/keys/${addr.toLegacyAddress()}`
    return pop.getPaymentRequest(url, 'put')
  }

  async uniformSample (addr) {
    // TODO: Sample correctly
    let server = this.chooseServer()
    return KeyserverHandler.fetchMetadata(server, addr)
  }

  async getContact (addr) {
    // Get metadata
    let metadata = await this.uniformSample(addr)

    // Get PubKey
    let pubKey = metadata.getPubKey()

    let payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

    // Find vCard
    function isVCard (entry) {
      return entry.getKind() === 'vcard'
    }
    let entryList = payload.getEntriesList()
    let rawCard = entryList.find(isVCard).getEntryData() // TODO: Cancel if not found
    let strCard = new TextDecoder().decode(rawCard)
    let vCard = new VCard().parse(strCard)

    let name = vCard.data.fn._data

    // let bio = vCard.data.note._data
    let bio = ''

    // Get avatar
    function isAvatar (entry) {
      return entry.getKind() === 'avatar'
    }
    let avatarEntry = entryList.find(isAvatar)
    let rawAvatar = avatarEntry.getEntryData()

    // TODO: Use util function
    function _arrayBufferToBase64 (buffer) {
      var binary = ''
      var bytes = new Uint8Array(buffer)
      var len = bytes.byteLength
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return window.btoa(binary)
    }
    let value = avatarEntry.getHeadersList()[0].getValue()
    let avatarDataURL = 'data:' + value + ';base64,' + _arrayBufferToBase64(rawAvatar)

    let profile = {
      name,
      bio,
      avatar: avatarDataURL,
      acceptancePrice: 'Unknown',
      pubKey
    }
    return profile
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
      // TODO: Do something with err
    }
  }
}

export default KeyserverHandler
