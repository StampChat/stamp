import axios from 'axios'
import paymentrequest from '../keyserver/paymentrequest_pb'
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

    // Update balances
    await store.dispatch['wallet/updateBalances']

    let addresses = store.getters['wallet/getAddresses']

    // Collect inputs
    let client = store.getters['electrumHandler/getClient']
    let utxos = []
    let signingKeys = []
    let fee = 500
    let complete = false
    let inputValue = 0
    for (let addr in addresses) {
      let vals = addresses[addr]
      if (vals.balance !== 0) {
        let outputs = await client.blockchainAddress_listunspent(addr)
        for (let index in outputs) {
          let value = outputs[index].value
          inputValue += value
          utxos.push({
            'txId': outputs[index].tx_hash,
            'outputIndex': outputs[index].tx_pos,
            'satoshis': value,
            'address': addr,
            'script': cashlib.Script.buildPublicKeyHashOut(addr).toHex()
          })
          signingKeys.push(vals.privKey)
          if (totalOutput + fee < inputValue) {
            complete = true
          }
        }
      }
      if (complete) {
        break
      }
    }

    // TODO: Check for insufficient funds

    // Construct Transaction
    let transaction = new cashlib.Transaction()

    // Add inputs
    for (let i in utxos) {
      transaction = transaction.from(utxos[i])
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
    transaction = transaction.fee(fee).change(Object.keys(addresses)[0])

    for (let i in signingKeys) {
      transaction = transaction.sign(signingKeys[i])
    }
    let rawTransaction = transaction.toBuffer()

    // Send payment and receive token
    let payment = new paymentrequest.Payment()
    payment.addTransactions(rawTransaction)
    payment.setMerchantData(paymentDetails.getMerchantData())
    let paymentUrl = paymentDetails.getPaymentUrl()

    return { payment, paymentUrl }
  }
}
