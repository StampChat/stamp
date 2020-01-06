import axios from 'axios'
import messages from './messages'
import filters from './filters'

class RelayClient {
  constructor (url) {
    this.url = url
  }

  static constructTextMessage (text, privKey) {
    // Construct vCard
    let textEntry = new messages.Entry()
    textEntry.setKind('text-utf8')
    let rawText = new TextEncoder("utf-8").encode(text)
    textEntry.setEntryData(rawText)

    // Construct payload
    let payload = new messages.Payload()
    payload.setTimestamp(Math.floor(Date.now() / 1000))
    payload.addEntries(textEntry)

    let serializedPayload = payload.serializeBinary()
    let hashbuf = cashlib.crypto.Hash.sha256(serializedPayload)
    let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    let message = new messages.Message()
    let sig = ecdsa.sig.toCompact(1).slice(1)
    message.setPubKey(privKey.toPublicKey().toBuffer())
    message.setSignature(sig)
    message.setScheme(1)
    message.setSerializedPayload(serializedPayload)

    return message
  }

  async getPaymentRequest (addr, path, method) {
    let url = `${this.url}/${path}$/${addr.toLegacyAddress()}`

    try {
      await axios({
        method,
        url: url,
        responseType: 'arraybuffer'
      })
    } catch (err) {
      let response = err.response
      if (response.status === 402) {
        let paymentRequest = paymentrequest.PaymentRequest.deserializeBinary(response.data)
        let serializedPaymentDetails = paymentRequest.getSerializedPaymentDetails()
        let paymentDetails = paymentrequest.PaymentDetails.deserializeBinary(serializedPaymentDetails)
        return { paymentRequest, paymentDetails }
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
      // TODO: Do something with err
    }

    let token = response.headers['authorization']
    let paymentReceipt = response.data
    return { paymentReceipt, token }
  }

  static async getMessages(addr, server, token, startTime, endTime) {
    let url = `${server}/message/${addr.toLegacyAddress()}`

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
        data: rawMetadata
      })
    } catch (err) {
      // TODO: Do something with err
    }
    if (response.status === 200) {
      let messageSet = messages.Message.deserializeBinary(response.data)
      return messageSet
    }
  }

  static async putMessages (addr, server, messageSet) {
    let rawMetadata = messageSet.serializeBinary()
    let url = `${server}/message/${addr.toLegacyAddress()}`
    try {
      await axios({
        method: 'put',
        url: url,
        data: rawMetadata
      })
    } catch (err) {
      // TODO: Do something with err
    }
  }
}

export default RelayClient
