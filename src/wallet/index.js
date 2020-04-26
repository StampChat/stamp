import * as R from 'ramda'
import * as P from 'bluebird'

import { numAddresses, numChangeAddresses } from '../utils/constants'

import formatting from '../utils/formatting'
import { calcId } from './helpers'

const cashlib = require('bitcore-lib-cash')

export class MockWalletStorage {
  constructor () {
    this.utxos = {}
    this.frozenUTXOs = {}
  }
  getFrozenUTXOs () {
    return this.frozenUTXOs
  }
  removeUTXO (id) {
    delete this.utxos[id]
  }
  removeFrozenUTXO (id) {
    delete this.frozenUTXOs[id]
  }
  addUTXO (output) {
    this.utxos[calcId(output)] = output
  }
  freezeUTXO (id) {
    let frozenUTXO = this.utxos[id]
    delete this.utxos[id]
    this.frozenUTXOs[id] = frozenUTXO
  }
  unfreezeUTXO (id) {
    let utxo = this.frozenUTXOs[id]
    delete this.frozenUTXOs[id]
    this.utxos[id] = utxo
  }
}

export class Wallet {
  constructor (storage) {
    this.storage = storage
  }
  setElectrumClient (client) {
    this.electrumClient = client
  }
  setXPrivKey (xPrivKey) {
    this._xPrivKey = xPrivKey
    this._identityPrivKey = xPrivKey.deriveChild(20102019)
      .deriveChild(0, true)
      .privateKey // TODO: Proper path for this
  }
  async init () {
    console.log('initializing wallet')
    this.initAddresses()
    this.updateHDUTXOs()
    this.startListeners()
    this.fixFrozenUTXOs()
    this.fixUTXOs()
  }
  get xPrivKey () {
    return this._xPrivKey
  }
  get identityPrivKey () {
    return this._identityPrivKey
  }
  initAddresses () {
    const xPrivKey = this.xPrivKey
    this.addresses = {}
    this.changeAddresses = {}
    this.electrumScriptHashes = {}
    for (var i = 0; i < numAddresses; i++) {
      let privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(145, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(i)
        .privateKey
      let address = privKey.toAddress('testnet').toLegacyAddress()
      this.setAddress({ address, privKey })

      // Index by script hash
      let scriptHash = formatting.toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: false, privKey })
    }
    for (var j = 0; j < numChangeAddresses; j++) {
      let privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(145, true)
        .deriveChild(0, true)
        .deriveChild(1)
        .deriveChild(j)
        .privateKey
      let address = privKey.toAddress('testnet').toLegacyAddress()
      this.setChangeAddress({ address, privKey })

      // Index by script hash
      let scriptHash = formatting.toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: true, privKey })
    }
  }
  addElectrumScriptHash ({ scriptHash, address, change }) {
    this.electrumScriptHashes[scriptHash] = { address, change }
  }
  setAddress ({ address, privKey }) {
    this.addresses[address] = { privKey }
  }
  setChangeAddress ({ address, privKey }) {
    this.changeAddresses[address] = { privKey }
  }
  refreshUTXOsByAddr ({ addr, outputs }) {
    // Delete all utxos by address
    Object.entries(this.storage.getUTXOs()).forEach(([id, utxo]) => {
      if (utxo.address === addr) {
        this.storage.removeUTXO(id)
      }
    })
    // Make a copy so this is not mutated
    const frozenUTXOs = { ...this.storage.getFrozenUTXOs() }
    // Remove all frozen utxos by address
    Object.entries(frozenUTXOs).forEach(([id, utxo]) => {
      if (utxo.address === addr) {
        this.storage.removeFrozenUTXO(id)
      }
    })

    outputs.forEach(output => {
      const id = calcId(output)
      this.storage.addUTXO(output)
      if (id in frozenUTXOs) {
        this.storage.freezeUTXO(id)
      }
    })
  }
  async updateUTXOFromScriptHash (scriptHash) {
    let client = this.electrumClient
    try {
      const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
      const { address, privKey } = this.getAddressByElectrumScriptHash(scriptHash)
      const outputs = elOutputs.map(elOutput => {
        const output = {
          txId: elOutput.tx_hash,
          outputIndex: elOutput.tx_pos,
          satoshis: elOutput.value,
          type: 'p2pkh',
          address,
          privKey
        }
        return output
      })
      this.refreshUTXOsByAddr({ addr: address, outputs })
    } catch (err) {
      console.error('error deserializing utxo address', err, scriptHash)
    }
  }
  async updateHDUTXOs () {
    // Check HD Wallet
    const scriptHashes = Object.keys(this.electrumScriptHashes)
    await P.map(scriptHashes, scriptHash => this.updateUTXOFromScriptHash(scriptHash), { concurrency: 20 })
  }
  async fixFrozenUTXO (utxoId) {
    // Unfreeze UTXO if confirmed to be unspent else delete
    // WARNING: This is not thread-safe, do not call when others hold the UTXO
    const client = this.electrumClient
    const utxo = this.storage.getFrozenUTXOs()[utxoId]
    if (!utxo) {
      console.log(`Missing UTXO for ${utxoId}`)
      return
    }
    try {
      const scriptHash = formatting.toElectrumScriptHash(utxo.address)
      const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
      if (elOutputs.some(output => {
        return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
      })) {
        // Found utxo
        this.storage.unfreezeUTXO(utxoId)
      } else {
        this.storage.removeFrozenUTXO(utxoId)
      }
    } catch (err) {
      console.error('error deserializing utxo address', err, utxo)
    }
  }
  async fixFrozenUTXOs () {
    // Unfreeze UTXO if confirmed to be unspent else delete, for all frozen UTXOs
    // WARNING: This is not thread-safe, do not call when others hold the UTXO
    const frozenUTXOs = this.storage.getFrozenUTXOs()
    await P.map(Object.values(frozenUTXOs),
      async (id) => {
        this.fixFrozenUTXO(id)
      },
      { concurrency: 10 })
  }
  async fixUTXOs () {
    // Unfreeze UTXO if confirmed to be unspent else delete, for all (non-p2pkh) UTXOs
    // WARNING: This is not thread-safe, do not call when others hold the UTXO
    const client = this.electrumClient
    const utxos = this.storage.getUTXOs()
    await P.map(Object.keys(utxos),
      async id => {
        const utxo = utxos[id]
        if (utxo.type !== 'p2pkh') {
          try {
            const scriptHash = formatting.toElectrumScriptHash(utxo.address)
            const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
            if (!elOutputs.some(output => {
              return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
            })) {
            // No such utxo
              this.storage.removeUTXO(id)
            }
          } catch (err) {
            console.error('error deserializing utxo address', err, utxo)
          }
        }
      },
      { concurrency: 10 })
  }
  async startListeners () {
    let ecl = this.electrumClient
    const addresses = Object.keys(this.allAddresses)
    await ecl.events.on(
      'blockchain.scripthash.subscribe',
      async (result) => {
        let scriptHash = result[0]
        await this.updateUTXOFromScriptHash(scriptHash)
      })

    await P.map(addresses, addr => {
      let scriptHash = cashlib.Script.buildPublicKeyHashOut(addr)
      let scriptHashRaw = scriptHash.toBuffer()
      let digest = cashlib.crypto.Hash.sha256(scriptHashRaw)
      let digestHexReversed = digest.reverse().toString('hex')

      return ecl.request('blockchain.scripthash.subscribe', digestHexReversed)
    },
    { concurrency: 20 })
  }
  constructTransaction ({ outputs, exactOutputs = false }) {
    const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
    const standardInputSize = 175 // A few extra bytes
    const feePerByte = this.feePerByte

    let transaction = new cashlib.Transaction()

    // Add outputs
    for (const i in outputs) {
      const output = outputs[i]
      transaction = transaction.addOutput(output)
    }

    // Coin selection
    const addresses = this.allAddresses

    const signingKeys = []
    const usedUtxos = []

    const amountRequired = transaction.outputAmount
    const utxos = Object.values(this.storage.getUTXOs())
    // Sort available UTXOs by total amount per transaction
    const sortedUtxos = R.pipe(
      R.groupBy(utxo => utxo.txId),
      R.map(
        R.pipe(
          R.sort((utxoA, utxoB) => utxoB.satoshis - utxoA.satoshis),
          (utxoGroup) => R.reduce(
            (group, utxo) => {
              group.satoshis += utxo.satoshis
              group.utxos.push(utxo)
              return group
            }, { satoshis: 0, utxos: [] }, utxoGroup) // Avoid currying the static initialization parameter.
          // We want a different one for each group
        )
      ),
      txMap => Object.values(txMap),
      R.sort((txA, txB) => txB.satoshis - txA.satoshis),
      R.map(group => group.utxos),
      R.flatten()
    )(utxos)
    const biggerUtxos = sortedUtxos.filter((a) => a.satoshis >= amountRequired + (transaction._estimateSize() + standardUtxoSize + standardInputSize) * feePerByte)
    const utxoSetToUse = biggerUtxos.length !== 0 ? [biggerUtxos[biggerUtxos.length - 1]] : sortedUtxos

    let satoshis = 0
    for (const utxo of utxoSetToUse) {
      const txnSize = transaction._estimateSize()
      if (satoshis > amountRequired + txnSize * feePerByte) {
        break
      }
      usedUtxos.push(utxo)
      console.log(utxo)

      const addr = utxo.address
      utxo['script'] = cashlib.Script.buildPublicKeyHashOut(addr).toHex()
      // Grab private key
      signingKeys.push(utxo.privKey)
      transaction = transaction.from(utxo)
      satoshis += utxo.satoshis
    }

    if (satoshis < amountRequired) {
      throw Error('insufficient funds')
    }

    usedUtxos.map(
      utxo => this.storage.freezeUTXO(calcId(utxo))
    )

    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.

    // A good round number greater than the current dustLimit.
    // We may want to make it some computed value in the future.
    const minimumOutputAmount = 5120
    const changeAddresses = Object.keys(this.changeAddresses)

    for (const changeAddress of changeAddresses) {
      const delta = transaction.inputAmount - transaction.outputAmount
      const size = transaction._estimateSize() + transaction.outputs.length
      const overallChangeUtxoCost = minimumOutputAmount + standardUtxoSize * feePerByte + size * feePerByte
      if (delta < overallChangeUtxoCost) {
        console.log("Can't make another output given currently available funds", delta, overallChangeUtxoCost)
        // We can't make more outputs without going over the fee.
        break
      }
      // Generate an output with an amount between [minimumOutputAmount, delta - size * feePerByte].
      const upperBound = delta - (overallChangeUtxoCost)
      const splitPosition = Math.ceil(Math.random() * upperBound)
      const largerAmount = (splitPosition >= upperBound - splitPosition ? splitPosition : upperBound - splitPosition)
      // Use the amount which gives us a fee larger than the fee per byte, but minimally so
      const changeOutputAmount = largerAmount + minimumOutputAmount
      // NOTE: This may generate a relatively large amount for the fee. We *could*
      // change the output amount to be equal to the (delta - estimatedSize * feePerByte)
      // however, we will sweep it into the first output instead to generate some noise
      console.log('Generating a change UTXO for amount:', changeOutputAmount)
      // Create the output
      const output = new cashlib.Transaction.Output({
        script: cashlib.Script.buildPublicKeyHashOut(changeAddress).toHex(),
        satoshis: changeOutputAmount
      })
      transaction = transaction.addOutput(output)
    }
    // NOTE: We are not using Bitcore to set change

    // Shift any remainder to other outputs randomly
    let outputIndex = -1
    const mutableOutputs = exactOutputs ? transaction.outputs.length - outputs.length : transaction.outputs.length
    // NOTE: we don't change the number of outputs here, but we also don't want to execute anythign if there are no outputs
    // eslint-disable-next-line no-unmodified-loop-condition
    while (mutableOutputs > 0) {
      outputIndex = (outputIndex + 1) % mutableOutputs
      const output = transaction.outputs[outputIndex + (exactOutputs ? outputs.length : 0)]
      const delta = transaction.inputAmount - transaction.outputAmount
      const finalSize = transaction._estimateSize() + transaction.outputs.length // Numbers are variable length in bitcoin, changing the output amount could add a byte to any given txn.
      const properFee = Math.ceil(finalSize * feePerByte)
      const upperBound = delta - properFee
      const splitPosition = Math.floor(Math.random() * upperBound)
      // Add a small amount to the current output
      const amountToAdd = splitPosition > upperBound - splitPosition ? upperBound - splitPosition : splitPosition
      console.log('Amount available', delta, 'Fee required', properFee, 'Will add', amountToAdd, 'To output #', outputIndex)
      if (amountToAdd === 0) {
        // We can't add anymore funds to any outputs
        break
      }
      output.satoshis += amountToAdd
      transaction._outputAmount += amountToAdd
    }

    // Sign transaction
    transaction = transaction.sign(signingKeys)
    const finalTxnSize = transaction._estimateSize()
    // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation
    console.log('size', finalTxnSize, 'outputAmount', transaction.outputAmount, 'inputAmount', transaction.inputAmount, 'delta', transaction.inputAmount - transaction.outputAmount, 'feePerByte', (transaction.inputAmount - transaction.outputAmount) / transaction._estimateSize())
    console.log(transaction)
    return { transaction, usedIDs: usedUtxos.map(utxo => calcId(utxo)) }
  }
  get feePerByte () {
    return 2
  }
  getAddressByElectrumScriptHash (scriptHash) {
    return this.electrumScriptHashes[scriptHash]
  }
  getPaymentAddress (seqNum) {
    return Object.keys(this.addresses)[seqNum]
  }
  get balance () {
    return Object.values(this.storage.getUTXOs()).reduce((acc, output) => acc + output.satoshis, 0)
  }
  get myAddress () {
    // TODO: Not just testnet
    return this.identityPrivKey.toAddress('testnet')
  }
  get myAddressStr () {
    // TODO: Not just testnet
    return this.identityPrivKey.toAddress('testnet')
      .toCashAddress()
  }
  get allAddresses () {
    return { ...this.addresses, ...this.changeAddresses }
  }
  get privKeys () {
    return Object.freeze(Object.values(this.addresses).map(address => Object.freeze(address.privKey)))
  }
  unfreezeUTXO (id) {
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.unfreezeUTXO(id)
  }
  addUTXO (utxo) {
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.addUTXO(utxo)
  }
  removeUTXO (id) {
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.removeUTXO(id)
  }
}
