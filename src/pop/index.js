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
      console.log(err)
      console.log(err.response)
      // TODO: Do something with err
    }

    let token = response.headers['authorization']
    let paymentReceipt = response.data
    return { paymentReceipt, token }
  },

  async constructPaymentTransaction (paymentDetails) {
    // Get Outputs
    var totalOutput = 0
    let requestOutputs = paymentDetails.getOutputsList()
    for (let i in requestOutputs) {
      let output = requestOutputs[i]
      totalOutput += output.getAmount()
    }

    // Update UTXOs
    await store.dispatch('wallet/updateUTXOs')

    // Collect inputs
    let addresses = store.getters['wallet/getAddresses']
    let inputUTXOs = []
    let signingKeys = []
    let fee = 500 // TODO: Not const
    let inputValue = 0
    let utxos = await store.getters['wallet/getUTXOs']

    for (let i in utxos) {
      let output = utxos[i]
      store.dispatch('wallet/removeUTXO', output)

      inputValue += output.satoshis
      let addr = output.address
      output['script'] = cashlib.Script.buildPublicKeyHashOut(addr).toHex()
      inputUTXOs.push(output)

      let signingKey = addresses[addr].privKey
      signingKeys.push(signingKey)
      if (totalOutput + fee < inputValue) {
        break
      }
    }

    // TODO: Check for insufficient funds

    // Construct Transaction
    let transaction = new cashlib.Transaction()

    // Add inputs
    for (let i in inputUTXOs) {
      transaction = transaction.from(inputUTXOs[i])
    }

    // Add Outputs from PaymentRequest
    for (let i in requestOutputs) {
      let script = requestOutputs[i].getScript()
      let satoshis = requestOutputs[i].getAmount()
      let output = new cashlib.Transaction.Output({
        script,
        satoshis
      })
      transaction = transaction.addOutput(output)
    }

    // Add change Output
    let changeAddr = Object.keys(addresses)[0]
    transaction = transaction.fee(fee).change(Object.keys(addresses)[0]) // TODO: Properly handle change

    // Sign
    for (let i in signingKeys) {
      transaction = transaction.sign(signingKeys[i])
    }
    let rawTransaction = transaction.toBuffer()

    // Add change output
    let changeOutput = {
      address: changeAddr,
      outputIndex: 1, // This is because we have only 1 stamp output
      satoshis: inputValue - fee - totalOutput,
      txId: transaction.hash,
      type: 'p2pkh'
    }
    store.dispatch('wallet/addUTXO', changeOutput)

    // Send payment and receive token
    let payment = new paymentrequest.Payment()
    payment.addTransactions(rawTransaction)
    payment.setMerchantData(paymentDetails.getMerchantData())
    let paymentUrl = paymentDetails.getPaymentUrl()

    return { payment, paymentUrl }
  }
}
