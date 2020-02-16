import axios from 'axios'
import messages from './messages_pb'
import filters from './filters_pb'
import pop from '../pop/index'
import store from '../store/index'
import { pingTimeout, relayReconnectInterval } from '../utils/constants'

const WebSocket = window.require('ws')

class RelayClient {
  constructor (url) {
    this.url = url
    this.httpScheme = 'http'
    this.wsScheme = 'ws'
  }

  async filterPaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/${addr}/filters`
    return pop.getPaymentRequest(url, 'put')
  }

  setUpWebsocket (addr, token) {
    let url = `${this.wsScheme}://${this.url}/${addr}/ws`
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
    let url = `${this.httpScheme}://${this.url}/${addr}/filters`
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
    let url = `${this.httpScheme}://${this.url}/${addr}/filters`
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
    let url = `${this.httpScheme}://${this.url}/${addr}/messages`
    let response = await axios({
      method: 'get',
      url: url,
      headers: {
        'Authorization': token
      },
      params: {
        start: startTime,
        end: endTime
      },
      responseType: 'arraybuffer'
    })

    if (response.status === 200) {
      let messagePage = messages.MessagePage.deserializeBinary(response.data)
      return messagePage
    }
  }

  async messagePaymentRequest (addr) {
    let url = `${this.httpScheme}://${this.url}/${addr}/messages`
    return pop.getPaymentRequest(url, 'get')
  }

  async pushMessages (addr, messageSet) {
    let rawMetadata = messageSet.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/${addr}/messages`
    await axios({
      method: 'put',
      url: url,
      data: rawMetadata
    })
  }
}

export default RelayClient
