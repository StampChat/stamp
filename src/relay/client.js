import axios from 'axios'
import messages from './messages_pb'
import addressmetadata from '../keyserver/addressmetadata_pb'
import VCard from 'vcf'
import filters from './filters_pb'
import pop from '../pop/index'
import store from '../store/index'
import { pingTimeout, relayReconnectInterval } from '../utils/constants'

const WebSocket = window.require('ws')
const cashlib = require('bitcore-lib-cash')

class RelayClient {
  constructor (url) {
    this.url = url
    this.httpScheme = 'http'
    this.wsScheme = 'ws'
  }

  async filterPaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/filters/${addr}`
    return pop.getPaymentRequest(url, 'put')
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

  async getProfile (addr) {
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    let response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    })
    let metadata = addressmetadata.AddressMetadata.deserializeBinary(response.data)

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

    let keyserver = {
      name,
      bio,
      avatar: avatarDataURL,
      pubKey
    }
    return keyserver
  }

  setUpWebsocket (addr, token) {
    let url = `${this.wsScheme}://${this.url}/ws/${addr}`
    let opts = { headers: { Authorization: token } }
    let socket = new WebSocket(url, opts)

    socket.onmessage = function (event) {
      let buffer = event.data
      let timedMessageSet = messages.TimedMessageSet.deserializeBinary(buffer)
      let timestamp = timedMessageSet.getTimestamp()
      let messageList = timedMessageSet.getMessagesList()
      for (let index in messageList) {
        let message = messageList[index]
        store.dispatch('chats/receiveMessage', { timestamp, message })
      }
      let lastReceived = store.getters['chats/getLastReceived'] || 0
      lastReceived = Math.max(lastReceived, timestamp)
      if (lastReceived) {
        store.commit('chats/setLastReceived', lastReceived + 1)
      }
    }

    const disconnectHandler = () => {
      store.dispatch('relayClient/setConnected', false)
      setTimeout(() => {
        this.setUpWebsocket(addr, token)
      }, relayReconnectInterval)
    }

    socket.onerror = function (err) {
      console.error(err)
    }
    socket.onclose = function (close) {
      disconnectHandler()
    }
    socket.onopen = function (open) {
      store.dispatch('relayClient/setConnected', true)
    }

    // Setup ping timeout
    this.pingTimeout = setTimeout(() => {
      socket.terminate()
    }, pingTimeout)
    socket.on('ping', () => {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = setTimeout(() => {
        socket.terminate()
      }, pingTimeout)
    })
  }

  async getAcceptancePrice (addr) {
    // Get fee
    let acceptancePrice
    try {
      let filters = await this.getFilter(addr)
      let priceFilter = filters.getPriceFilter()
      acceptancePrice = priceFilter.getAcceptancePrice()
    } catch (err) {
      acceptancePrice = 'Unknown'
    }
    return acceptancePrice
  }

  async getFilter (addr) {
    let url = `${this.httpScheme}://${this.url}/filters/${addr}`
    let response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    })

    if (response.status === 200) {
      let filtersMsg = filters.Filters.deserializeBinary(response.data)
      return filtersMsg
    }
  }

  async applyFilter (addr, filterApplication, token) {
    let rawApplication = filterApplication.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/filters/${addr}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        'Authorization': token
      },
      data: rawApplication
    })
  }

  async getMessages (addr, token, startTime, endTime) {
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    let response = await axios({
      method: 'get',
      url: url,
      headers: {
        'Authorization': token
      },
      params: {
        start_time: startTime,
        end_time: endTime
      },
      responseType: 'arraybuffer'
    })

    if (response.status === 200) {
      let messagePage = messages.MessagePage.deserializeBinary(response.data)
      return messagePage
    }
  }

  async messagePaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    return pop.getPaymentRequest(url, 'get')
  }

  async sendPayment (paymentUrl, payment) {
    // TODO: Relative vs absolute
    let url = `${this.httpScheme}://${this.url}${paymentUrl}`
    return pop.sendPayment(url, payment)
  }

  async pushMessages (addr, messageSet) {
    let rawMetadata = messageSet.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/messages/${addr}`
    await axios({
      method: 'put',
      url: url,
      data: rawMetadata
    })
  }
}

export default RelayClient
