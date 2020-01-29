import axios from 'axios'
import messages from './messages_pb'
import filters from './filters_pb'
import pop from '../pop/index'
import store from '../store/index'

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
    let response
    try {
      response = await axios({
        method: 'get',
        url,
        responseType: 'arraybuffer'
      })
    } catch (err) {
      // TODO: Do something with err
    }
    if (response.status === 200) {
      let filtersMsg = filters.Filters.deserializeBinary(response.data)
      return filtersMsg
    }
  }

  async applyFilter (addr, filterApplication, token) {
    let rawApplication = filterApplication.serializeBinary()
    let url = `${this.httpScheme}://${this.url}/${addr}/filters`
    try {
      await axios({
        method: 'put',
        url: url,
        headers: {
          'Authorization': token
        },
        data: rawApplication
      })
    } catch (err) {
      // TODO: Do something with err
      console.log(err)
      console.log(err.response)
    }
  }

  async getMessages (addr, token, startTime, endTime) {
    let url = `${this.httpScheme}://${this.url}/${addr}/messages`

    let response
    try {
      response = await axios({
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
    } catch (err) {
      // TODO: Do something with err
      console.log(err)
      return
    }
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
