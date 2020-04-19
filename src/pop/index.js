import axios from 'axios'
import paymentrequest from './paymentrequest_pb'
import store from '../store/index'

const cashlib = require('bitcore-lib-cash')

export default {
  async getPaymentRequest (url, method) {
    try {
      await axios({
        method,
        url,
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
  },

  async sendPayment (paymentUrl, payment) {
    var rawPayment = payment.serializeBinary()
    let response
    response = await axios({
      method: 'post',
      headers: {
        'Content-Type': 'application/bitcoincash-payment',
        'Accept': 'application/bitcoincash-paymentack'
      },
      url: paymentUrl,
      data: rawPayment
    })

    let token = response.headers['authorization']
    let paymentReceipt = response.data
    return { paymentReceipt, token }
  },

  async constructPaymentTransaction (paymentDetails) {
    // Get Outputs
    let requestOutputs = paymentDetails.getOutputsList()
    let outputs = requestOutputs.map(reqOutput => {
      let script = Buffer.from(reqOutput.getScript())
      let satoshis = reqOutput.getAmount()
      let output = new cashlib.Transaction.Output({
        script,
        satoshis
      })
      return output
    })

    // Construct tx
    let { transaction, usedIDs } = await store.dispatch('wallet/constructTransaction', { outputs, exactOutputs: true })
    let rawTransaction = transaction.toBuffer()

    // Send payment and receive token
    let payment = new paymentrequest.Payment()
    payment.addTransactions(rawTransaction)
    payment.setMerchantData(paymentDetails.getMerchantData())
    let paymentUrl = paymentDetails.getPaymentUrl()

    return { payment, paymentUrl, usedIDs }
  }
}
