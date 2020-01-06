import axios from 'axios'
import paymentrequest from './keyserver/paymentrequest_pb'

async function getPaymentRequest (url, method) {
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
}

async function sendPayment (paymentUrl, payment) {
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

export default { getPaymentRequest, sendPayment }
