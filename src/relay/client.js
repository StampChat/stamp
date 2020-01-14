import axios from 'axios'
import messages from './messages_pb'
import filters from './filters_pb'
import pop from '../pop/index'

class RelayClient {
  constructor (url) {
    this.url = url
  }

  async filterPaymentRequest (addr) {
    let url = `${this.url}/${addr}/filters`
    return pop.getPaymentRequest(url, 'put')
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
    let url = `${this.url}/${addr}/filters`
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
    let url = `${this.url}/${addr}/filters`
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
    let url = `${this.url}/${addr}/messages`

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
    let url = `${this.url}/${addr}/messages`
    return pop.getPaymentRequest(url, 'get')
  }

  async pushMessages (addr, messageSet) {
    let rawMetadata = messageSet.serializeBinary()
    let url = `${this.url}/${addr}/messages`
    try {
      await axios({
        method: 'put',
        url: url,
        data: rawMetadata
      })
    } catch (err) {
      console.log(err)
      console.log(err.response)
      // TODO: Do something with err
    }
  }
}

export default RelayClient
