import * as R from 'ramda'
import * as P from 'bluebird'
import assert from 'assert'

import { numAddresses, numChangeAddresses } from '../utils/constants'

import { toElectrumScriptHash } from '../utils/formatting'
import { calcId } from './helpers'

const cashlib = require('bitcore-lib-cash')

const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
const standardInputSize = 175 // A few extra bytes
const minimumOutputAmount = 5120
const feePerByte = 2

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
    const frozenUTXO = this.utxos[id]
    delete this.utxos[id]
    this.frozenUTXOs[id] = frozenUTXO
  }

  unfreezeUTXO (id) {
    const utxo = this.frozenUTXOs[id]
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
    const t0 = performance.now()
    this.initAddresses()
    const initAddressTime = performance.now()
    await this.updateHDUTXOs()
    const updateUTXOTime = performance.now()
    await this.startListeners()
    const startListenersTime = performance.now()
    await this.fixFrozenUTXOs()
    const fixFrozenUTXOsTime = performance.now()
    console.log(`initAddresses UTXOs took ${initAddressTime - t0} ms`)
    console.log(`updateUTXOTime UTXOs took ${updateUTXOTime - t0} ms`)
    console.log(`startListenersTime UTXOs took ${startListenersTime - t0} ms`)
    console.log(`fixFrozenUTXOsTime UTXOs took ${fixFrozenUTXOsTime - t0} ms`)
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
    for (let i = 0; i < numAddresses; i++) {
      const privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(145, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(i)
        .privateKey
      const address = privKey.toAddress('testnet').toLegacyAddress()
      this.setAddress({ address, privKey })

      // Index by script hash
      const scriptHash = toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: false, privKey })
    }
    for (let j = 0; j < numChangeAddresses; j++) {
      const privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(145, true)
        .deriveChild(0, true)
        .deriveChild(1)
        .deriveChild(j)
        .privateKey
      const address = privKey.toAddress('testnet').toLegacyAddress()
      this.setChangeAddress({ address, privKey })

      // Index by script hash
      const scriptHash = toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: true, privKey })
    }
  }

  addElectrumScriptHash ({ scriptHash, address, change, privKey }) {
    this.electrumScriptHashes[scriptHash] = { address, change, privKey }
  }

  setAddress ({ address, privKey }) {
    this.addresses[address] = { privKey }
  }

  setChangeAddress ({ address, privKey }) {
    this.changeAddresses[address] = { privKey }
  }

  refreshUTXOsByAddr ({ address, outputs }) {
    // Delete all utxos by address
    Object.entries(this.storage.getUTXOs()).forEach(([id, utxo]) => {
      if (utxo.address === address) {
        this.removeUTXO(id)
      }
    })
    // Make a copy so this is not mutated
    const frozenUTXOs = { ...this.storage.getFrozenUTXOs() }
    // Remove all frozen utxos by address
    Object.entries(frozenUTXOs).forEach(([id, utxo]) => {
      if (utxo.address === address) {
        this.storage.removeFrozenUTXO(id)
      }
    })

    outputs.forEach(output => {
      const id = calcId(output)
      this.addUTXO(output)
      if (id in frozenUTXOs) {
        this.storage.freezeUTXO(id)
      }
    })
  }

  async updateUTXOFromScriptHash (scriptHash) {
    const client = this.electrumClient
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
      this.refreshUTXOsByAddr({ address, outputs })
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
      const scriptHash = toElectrumScriptHash(utxo.address)
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
        await this.fixFrozenUTXO(id)
      },
      { concurrency: 10 })
  }

  async fixUTXOs () {
    // Unfreeze UTXO if confirmed to be unspent else delete, for all (non-p2pkh) UTXOs
    // WARNING: This is not thread-safe, do not call when others hold the UTXO
    const client = this.electrumClient
    const utxos = this.storage.getUTXOs()
    const utxoIds = Object.keys(utxos)
    console.log(`Refreshing state of ${utxoIds.length} utxos with electrum`)
    await P.map(utxoIds,
      async id => {
        const utxo = utxos[id]
        if (utxo.type !== 'p2pkh') {
          try {
            const scriptHash = toElectrumScriptHash(utxo.address)
            const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
            if (!elOutputs.some(output => {
              return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
            })) {
            // No such utxo
              this.removeUTXO(id)
            }
          } catch (err) {
            console.error('error deserializing utxo address', err, utxo)
          }
        }
      },
      { concurrency: 10 })
  }

  async startListeners () {
    const ecl = this.electrumClient
    const addresses = Object.keys(this.allAddresses)
    await ecl.events.on(
      'blockchain.scripthash.subscribe',
      async (result) => {
        const scriptHash = result[0]
        console.log('Subscription hit', result)
        await this.updateUTXOFromScriptHash(scriptHash)
      })

    await P.map(addresses, address => {
      const scriptHash = cashlib.Script.buildPublicKeyHashOut(address)
      const scriptHashRaw = scriptHash.toBuffer()
      const digest = cashlib.crypto.Hash.sha256(scriptHashRaw)
      const digestHexReversed = digest.reverse().toString('hex')

      return ecl.request('blockchain.scripthash.subscribe', digestHexReversed)
    },
    { concurrency: 20 })
  }

  async forwardUTXOsToAddress ({ utxos, address }) {
    let transaction = new cashlib.Transaction()

    const ourUtxos = this.storage.getUTXOs()
    const inputIds = utxos.map(utxo => calcId(utxo)).filter(id => id in ourUtxos)
    const utxoSetToUse = inputIds.map((id) => ourUtxos[id])
    let satoshis = 0
    const signingKeys = []
    if (!utxoSetToUse.length) {
      return
    }

    for (const utxo of utxoSetToUse) {
      const utxoAddress = utxo.address
      utxo.script = cashlib.Script.buildPublicKeyHashOut(utxoAddress).toHex()
      signingKeys.push(utxo.privKey)
      transaction = transaction.from(utxo)
      satoshis += utxo.satoshis
    }

    const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
    const txnSize = transaction._estimateSize() + standardUtxoSize
    const fees = txnSize * feePerByte

    transaction.to(address, satoshis - fees)
    inputIds.map(id => this.storage.freezeUTXO(id))
    // Sign transaction
    transaction = transaction.sign(signingKeys)

    console.log('broadcasting forwarding txn', transaction)
    const txHex = transaction.toString()
    try {
      await this.electrumClient.request('blockchain.transaction.broadcast', txHex)
    } catch (err) {
      console.error(err)
      // Unfreeze UTXOs if stealth tx broadcast fails
      inputIds.forEach(id => {
        this.unfreezeUTXO(id)
      })
      throw new Error('Error broadcasting forwarding transaction')
    }
    return { transaction, usedIDs: inputIds }
  }

  finalizeTransaction ({ transaction, exactOutputs = true, signingKeys }) {
    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.

    // A good round number greater than the current dustLimit.
    // We may want to make it some computed value in the future.
    const changeAddresses = Object.keys(this.changeAddresses)
    const outputs = [...transaction.outputs]

    for (const changeAddress of changeAddresses) {
      const delta = transaction.inputAmount - transaction.outputAmount
      const size = transaction._estimateSize() + transaction.outputs.length
      const overallChangeUtxoCost = minimumOutputAmount + standardUtxoSize * feePerByte + size * feePerByte
      if (delta < overallChangeUtxoCost) {
        console.log('Can\'t make another output given currently available funds', delta, overallChangeUtxoCost)
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
  }

  constructTransactionSet ({ addressGenerator, amount }) {
    const pickOne = function (arr) {
      if (arr.length === 0) {
        throw new RangeError('Chance: Cannot pickone() from an empty array')
      }
      return arr[Math.floor(Math.random() * Math.floor(arr.length))]
    }

    // Coin selection
    const transactionBundle = []
    let amountLeft = amount
    let retries = 0
    while (amountLeft > 0 && retries < 5) {
      const signingKeys = []
      const transaction = new cashlib.Transaction()
      const usedUtxos = []

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

      // Case 1: UTXO is bigger than amountLeft + fees.  Done.
      // Case 3: UTXO is bigger than amountLeft, but smaller than amountLeft + fees
      //    Need to decide how to fragment.  Can we fragment without making dust?
      //     If we would need to make dust, then don't use this UTXO (or, add another UTXO also)
      //     Split UTXO by sending some amount to a new address, and some to change.
      // Case 2: UTXO is smaller than amountLeft + fees.  Need to loop again
      let satoshis = 0
      const stagedUtxos = []
      while (true) {
        // Try to use a sufficiently large UTXO, otherwise pick one at random
        // Big enough to handle the amount left, plus 1 change output
        const requisiteSize = amountLeft + (transaction._estimateSize() + 2 * standardUtxoSize + standardInputSize + minimumOutputAmount) * feePerByte
        const biggerUtxos = sortedUtxos.filter((a) => a.satoshis >= requisiteSize)
        const utxoSetToUse = biggerUtxos.length !== 0 ? [biggerUtxos[biggerUtxos.length - 1]] : sortedUtxos
        const utxoToUse = pickOne(utxoSetToUse)
        stagedUtxos.push(utxoToUse)
        utxoToUse.script = cashlib.Script.buildPublicKeyHashOut(utxoToUse.address).toHex()
        transaction.from(utxoToUse)
        signingKeys.push(utxoToUse.privKey)
        const txnSize = transaction._estimateSize()
        // Grab private key
        satoshis += utxoToUse.satoshis
        // Make sure we don't generate dust
        if (satoshis > minimumOutputAmount + (txnSize + standardUtxoSize) * feePerByte) {
          break
        }
      }
      const address = addressGenerator()
      console.log(`transaction._estimateSize() + standardUtxoSize : ${transaction._estimateSize()} + ${standardUtxoSize}`)
      const availableAmount = satoshis - (transaction._estimateSize() + standardUtxoSize) * feePerByte
      // If availableAmount is the minimum, there will be no change output
      // if amountLeft is the minimum, there will need to be change.  However, the delta may be less than the dust limit
      // in which case we may want to throw this iteration away.
      const amountToUse = Math.min(amountLeft, availableAmount)
      transaction.addOutput(new cashlib.Transaction.Output({
        script: cashlib.Script(new cashlib.Address(address)),
        satoshis: amountToUse
      }))
      const availableForFeesAndChange = satoshis - amountToUse
      console.log(`availableForFeesAndChange ${availableForFeesAndChange}`)
      const availableForChange = availableForFeesAndChange - transaction._estimateSize() * feePerByte

      // We have a fairly large overage, but we don't have enough excess to create the output
      if (availableForChange > standardUtxoSize && availableForChange < minimumOutputAmount + standardUtxoSize * feePerByte) {
        console.log('availableForChange < minimumOutputAmount + standardUtxoSize * feePerByte')
        console.log(`${availableForChange} < ${minimumOutputAmount} + ${standardUtxoSize} * ${feePerByte}`)
        // Retry iteration
        retries++
        continue
      }

      // We can't generate another transaction
      const overage = amountLeft - amountToUse
      if (overage > 0 && overage < minimumOutputAmount) {
        console.log(`Amount left < minimumOutputAmount: ${amountLeft - amountToUse} < ${minimumOutputAmount}`)
        // Retry iteration
        retries++
        continue
      }
      amountLeft -= amountToUse
      usedUtxos.push(...stagedUtxos)
      stagedUtxos.map(
        utxo => this.storage.freezeUTXO(calcId(utxo))
      )
      this.finalizeTransaction({ transaction, signingKeys })
      transactionBundle.push({
        transaction,
        vouts: [0],
        usedIds: usedUtxos.map(utxo => calcId(utxo))
      })
    }

    assert(retries < 5, 'Error building transactions')
    return transactionBundle
  }

  constructTransaction ({ outputs, exactOutputs = false }) {
    let transaction = new cashlib.Transaction()

    // Add outputs
    for (const i in outputs) {
      const output = outputs[i]
      transaction = transaction.addOutput(output)
    }

    // Coin selection
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

      const address = utxo.address
      utxo.script = cashlib.Script.buildPublicKeyHashOut(address).toHex()
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
    this.finalizeTransaction({ transaction, signingKeys, exactOutputs })
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
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey.toAddress('testnet')
  }

  get myAddressStr () {
    // TODO: This should be in the relay client, not the wallet...
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
    assert(utxo.type)
    assert(utxo.privKey)
    assert(utxo.address)
    assert(utxo.satoshis)
    console.log('adding utxo', calcId(utxo))
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.addUTXO(utxo)
  }

  removeUTXO (id) {
    const utxos = this.storage.getUTXOs()
    if (!(id in utxos)) {
      console.log(id, 'missing from UTXO set?')
      return
    }
    console.log('removing utxo', id)
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.removeUTXO(id)
  }
}
