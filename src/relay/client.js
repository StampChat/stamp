import axios from 'axios'
import messaging from './messaging_pb'
import addressmetadata from '../keyserver/addressmetadata_pb'
import wrapper from '../pop/wrapper_pb'
import pop from '../pop/index'
import store from '../store/index'
import { pingTimeout, relayReconnectInterval } from '../utils/constants'
import VCard from 'vcf'

const WebSocket = window.require('ws')

class RelayClient {
  constructor (url) {
    this.url = url
    this.httpScheme = 'http'
    this.wsScheme = 'ws'
  }

  async profilePaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    return pop.getPaymentRequest(url, 'put')
  }

  async getRelayData (addr) {
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    let response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer'
    })
    let metadata = wrapper.AuthWrapper.deserializeBinary(response.data)

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
      pubKey
    }
    let inbox = {
      acceptancePrice: 100 // TODO: Parse
    }
    let relayData = {
      profile,
      inbox
    }
    return relayData
  }

  setUpWebsocket (addr, token) {
    let url = `${this.wsScheme}://${this.url}/ws/${addr}`
    let opts = { headers: { Authorization: token } }
    let socket = new WebSocket(url, opts)

    socket.onmessage = function (event) {
      let buffer = event.data
      let timedMessageSet = messaging.TimedMessageSet.deserializeBinary(buffer)
      let messageList = timedMessageSet.getMessagesList()

      let serverTime = timedMessageSet.getServerTime()
      let receivedTime = Date.now()
      for (let index in messageList) {
        let message = messageList[index]
        store.dispatch('chats/receiveMessage', { serverTime, receivedTime, message })
      }
      let lastReceived = store.getters['chats/getLastReceived'] || 0
      lastReceived = Math.max(lastReceived, receivedTime)
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

  async getRawPayload (addr, token, digest) {
    let url = `${this.httpScheme}://${this.url}/payloads/${addr}`
    let hexDigest = Array.prototype.map.call(digest, x => ('00' + x.toString(16)).slice(-2)).join('')
    let response = await axios({
      method: 'get',
      url,
      headers: {
        'Authorization': token
      },
      params: {
        digest: hexDigest
      },
      responseType: 'arraybuffer'
    })
    return response.data
  }

  async getPayload (addr, token, digest) {
    let rawPayload = this.getRawPayload(addr, token, digest)
    let payload = messaging.Payload.deserializeBinary(rawPayload)
    return payload
  }

  async putProfile (addr, profile, token) {
    let rawProfile = profile.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/profile/${addr}`
    await axios({
      method: 'put',
      url: url,
      headers: {
        'Authorization': token
      },
      data: rawProfile
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
      let messagePage = messaging.MessagePage.deserializeBinary(response.data)
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
