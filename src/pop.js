import axios from 'axios'
import paymentrequest from './bip70/paymentrequest_pb'

const cashlib = require('bitcore-lib-cash')

export default {
  async getPaymentRequest (url, method, data) {
    try {
      await axios({
        method,
        url,
        responseType: 'arraybuffer',
        data
      })
    } catch (err) {
      const response = err.response
      if (response.status === 402) {
        const paymentRequest = paymentrequest.PaymentRequest.deserializeBinary(response.data)
        const serializedPaymentDetails = paymentRequest.getSerializedPaymentDetails()
        const paymentDetails = paymentrequest.PaymentDetails.deserializeBinary(serializedPaymentDetails)
        return { paymentRequest, paymentDetails }
      }
    }
  },

  async sendPayment (paymentUrl, payment) {
    const rawPayment = payment.serializeBinary()
    const response = await axios({
      method: 'post',
      headers: {
        'Content-Type': 'application/bitcoincash-payment',
        Accept: 'application/bitcoincash-paymentack'
      },
      url: paymentUrl,
      data: rawPayment
    })

    const token = response.headers.authorization
    const paymentReceipt = response.data
    return { paymentReceipt, token }
  },

  constructPaymentTransaction (wallet, paymentDetails) {
    // Get Outputs
    const requestOutputs = paymentDetails.getOutputsList()
    const outputs = requestOutputs.map(reqOutput => {
      const script = Buffer.from(reqOutput.getScript())
      const satoshis = reqOutput.getAmount()
      const output = new cashlib.Transaction.Output({
        script,
        satoshis
      })
      return output
    })

    // Construct tx
    const { transaction, usedIDs } = wallet.constructTransaction({ outputs, exactOutputs: true })
    const rawTransaction = transaction.toBuffer()

    // Send payment and receive token
    const payment = new paymentrequest.Payment()
    payment.addTransactions(rawTransaction)
    payment.setMerchantData(paymentDetails.getMerchantData())
    const paymentUrl = paymentDetails.getPaymentUrl()

    return { payment, paymentUrl, usedIDs }
  }
}
