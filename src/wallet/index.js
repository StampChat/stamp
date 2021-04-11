import * as R from 'ramda'
import * as P from 'bluebird'
import assert from 'assert'

import { numAddresses, numChangeAddresses, displayNetwork as constantDisplayNetworkName, networkName as constantNetworkName } from '../utils/constants'

import { toElectrumScriptHash } from '../utils/formatting'

import { calcId } from './helpers'

import { Address, Script, Transaction } from 'bitcore-lib-cash'
import { Lock } from './lock'

const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
const standardInputSize = 175 // A few extra bytes
const minimumOutputAmount = 5120
const dustLimit = 600
const feePerByte = 2

const shuffleArray = function (arr) {
  const swaps = [...arr.keys()]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i)
    const temp = arr[i]
    const tempIndex = arr[i]
    arr[i] = arr[j]
    swaps[i] = swaps[j]
    arr[j] = temp
    swaps[j] = tempIndex
  }
  return swaps
}

export class Wallet {
  constructor (storage, { networkName = constantNetworkName, displayNetworkName = constantDisplayNetworkName } = {}) {
    this.storage = storage
    this.networkName = networkName
    this.displayNetworkName = displayNetworkName

    this.constructionLock = new Lock()
    // Workaround for the way electrum-cash ensures a subscription isn't handled
    // twice.
    // Fixes: "MaxListenersExceededWarning: Possible EventEmitter memory leak
    // detected. 11 blockchain.scripthash.subscribe listeners added to
    // [ElectrumClient]. Use emitter.setMaxListeners() to increase limit"
    this.scriptHashSubscriber = this.scriptHashUpdated.bind(this)
  }

  setElectrumClient (electrumClientPromise) {
    this.electrumClientPromise = electrumClientPromise
    this.init()
  }

  setXPrivKey (xPrivKey) {
    this._xPrivKey = xPrivKey
    // TODO: we're just using the first key in the HD addresses for now
    // so that it'll be compatible (mostly) with other HD wallets.
    // We should do something to allow revocations in the future.
    this._identityPrivKey = xPrivKey
      .deriveChild(44, true)
      .deriveChild(899, true)
      .deriveChild(0, true)
      .deriveChild(0)
      .deriveChild(0)
      .privateKey

    this.init()
  }

  async init () {
    console.log('initializing wallet')
    if (!this.xPrivKey) {
      return
    }
    const t0 = performance.now()
    this.initAddresses()
    const initAddressTime = performance.now()
    await this.updateHDUTXOs()
    const updateUTXOTime = performance.now()
    await this.startListeners()
    const startListenersTime = performance.now()
    console.log(`initAddresses UTXOs took ${initAddressTime - t0} ms`)
    console.log(`updateUTXOTime UTXOs took ${updateUTXOTime - t0} ms`)
    console.log(`startListenersTime UTXOs took ${startListenersTime - t0} ms`)
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
        .deriveChild(899, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(i)
        .privateKey
      const address = privKey.toAddress(this.networkName).toCashAddress()
      this.setAddress({ address, privKey })

      // Index by script hash
      const scriptHash = toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: false, privKey })
    }
    for (let j = 0; j < numChangeAddresses; j++) {
      const privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(899, true)
        .deriveChild(0, true)
        .deriveChild(1)
        .deriveChild(j)
        .privateKey
      const address = privKey.toAddress(this.networkName).toCashAddress()
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

  async refreshUTXOsByAddr ({ address, outputs }) {
    const ids = outputs.map((output) => calcId(output))
    const foundIds = []

    // Remove missing utxos
    const outpoints = await this.storage.getOutpoints()
    for (const [outpointId, outpoint] of outpoints) {
      if (outpoint.address !== address) {
        continue
      }
      const index = ids.indexOf(outpointId)
      foundIds.push(outpointId)
      if (index !== -1) {
        continue
      }
      ids.splice(index, 1)
      this.deleteOutpoint(outpointId)
    }

    // Add new unspent UTXO
    for (const outpoint of outputs) {
      const outpointId = calcId(outpoint)
      if (foundIds.includes(outpointId)) {
        continue
      }
      this.putOutpoint(outpoint)
    }
  }

  async updateUTXOFromScriptHash (scriptHash) {
    const client = await this.electrumClientPromise
    try {
      const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
      const addressMap = this.getAddressByElectrumScriptHash(scriptHash)
      const { address, privKey } = addressMap
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
      await this.refreshUTXOsByAddr({ address, outputs })
    } catch (err) {
      console.error('error deserializing utxo address', err, scriptHash)
    }
  }

  async updateHDUTXOs () {
    // Check HD Wallet
    const scriptHashes = Object.keys(this.electrumScriptHashes)
    await P.map(scriptHashes, scriptHash => this.updateUTXOFromScriptHash(scriptHash), { concurrency: 5 })
  }

  async startListeners () {
    const client = await this.electrumClientPromise
    const scriptHashes = Object.keys(this.electrumScriptHashes)

    await P.map(scriptHashes, scriptHash => client.subscribe(this.scriptHashSubscriber, 'blockchain.scripthash.subscribe', scriptHash), { concurrency: 5 })
  }

  async fixOutpoint (utxoId) {
    // TODO: This needs some thought to ensure we do not delete outpoints that
    // are possibly just out of sync with the mempool.

    // Unfreeze UTXO if confirmed to be unspent else delete
    // WARNING: This is not thread-safe, do not call when others hold the UTXO
    const client = await this.electrumClientPromise
    const utxo = await this.storage.getOutpoint(utxoId)
    if (!utxo) {
      console.log(`Missing UTXO for ${utxoId}`)
      return
    }
    console.log(`Fixing UTXO ${utxoId}`)
    try {
      const scriptHash = toElectrumScriptHash(utxo.address)
      const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
      if (elOutputs.some(output => {
        return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
      })) {
        console.log(`Unfreezing UTXO ${utxoId}`)
        this.storage.unfreezeOutpoint(utxoId)
        // Found utxo
        return
      }
      console.log(`Deleting UTXO ${utxoId}`)
      this.storage.deleteOutpoint(utxoId)
    } catch (err) {
      console.error('error deserializing utxo address', err, utxo)
    }
  }

  async scriptHashUpdated (params) {
    if (!(params instanceof Array)) {
      // Electrum-cash client is dumb and sends the initial subscription call response to our
      // callback handler. The data is not the same, and is actually a string with the
      // status of the particular scriptHash
      return
    }
    const [scriptHash, status] = params
    console.log('Subscription hit', scriptHash, status)
    await this.updateUTXOFromScriptHash(scriptHash)
  }

  async forwardUTXOsToAddress ({ utxos, address }) {
    let transaction = new Transaction()

    const outpointIds = utxos.map(utxo => calcId(utxo))
    const signingKeys = []
    let satoshis = 0

    const usedIDs = []
    for (const outpointId of outpointIds) {
      const outpoint = this.storage.getOutpoint(outpointId)
      if (!outpoint) {
        continue
      }
      usedIDs.push(outpointId)
      outpoint.script = Script.buildPublicKeyHashOut(outpoint.address).toHex()
      signingKeys.push(outpoint.privKey)
      transaction = transaction.from(outpoint)
      satoshis += outpoint.satoshis
    }

    if (usedIDs.length === 0) {
      return { transaction: null, usedIDs: [] }
    }

    const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
    const txnSize = transaction._estimateSize() + standardUtxoSize
    const fees = txnSize * feePerByte

    transaction.to(address, satoshis - fees)
    // Sign transaction
    transaction = transaction.sign(signingKeys)

    console.log('Broadcasting forwarding txn', transaction)
    const txHex = transaction.toString()
    try {
      const electrumClient = await this.electrumClientPromise
      await electrumClient.request('blockchain.transaction.broadcast', txHex)
      // TODO: we shouldn't be dealing with this here. Leaky abstraction
      usedIDs.map(id => this.storage.deleteOutpoint(id))
    } catch (err) {
      console.error(err)
      // Fix UTXOs if tx broadcast fails
      usedIDs.forEach(id => {
        this.fixOutpoint(id)
      })
      throw new Error('Error broadcasting forwarding transaction')
    }
    return { transaction, usedIDs }
  }

  finalizeTransaction ({ transaction, signingKeys }) {
    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.
    const changeAddresses = Object.keys(this.changeAddresses)
    shuffleArray(changeAddresses)
    const OOM = (amount) => Math.floor(Math.log2(amount))
    const amountOOM = OOM(transaction.outputs[0].satoshis)
    // Amount to skip
    // TODO: Still probably leaks some information about which outputs are non-change
    // NOTE: We are not using Bitcore to set change
    let skipAmount = 0
    // Create change outputs randomly in decreasing orders of magnitude
    for (const changeAddress of changeAddresses) {
      const estimatedFutureSize = transaction._estimateSize() + 1 * standardUtxoSize
      const delta = transaction.inputAmount - transaction.outputAmount - skipAmount
      console.log(`Available amount for change and fees = ${delta}`)
      if (delta < dustLimit + estimatedFutureSize * feePerByte) {
        console.log(`Can't make another output given currently available funds ${delta} < ${dustLimit + estimatedFutureSize * feePerByte}`)
        // We can't make more outputs without going over the fee.
        break
      }

      const upperBound = delta - estimatedFutureSize * feePerByte
      const changeOutputAmount = Math.ceil(Math.random() * (upperBound - skipAmount - dustLimit)) + skipAmount + dustLimit
      if (amountOOM === OOM(changeOutputAmount)) {
        skipAmount += changeOutputAmount
        console.log('Skipping change output due to same OOM as recipient amount')
        continue
      }
      skipAmount = 0

      // NOTE: This may generate a relatively large amount for the fee. We *could*
      // change the output amount to be equal to the (delta - estimatedSize * feePerByte)
      // however, we will sweep it into the first output instead to generate some noise
      console.log('Generating a change UTXO for amount:', changeOutputAmount)
      // Create the output
      const output = new Transaction.Output({
        script: Script.buildPublicKeyHashOut(changeAddress).toHex(),
        satoshis: changeOutputAmount
      })
      transaction = transaction.addOutput(output)
    }

    transaction = transaction.sign(signingKeys)
    // Shift any remainder to other outputs randomly
    // NOTE: we don't change the number of outputs here, but we also don't want to execute anythign if there are no outputs
    // eslint-disable-next-line no-unmodified-loop-condition
    const outputIndex = 1
    // Add any excess money back to the first (largest) change output before shuffling.
    // If there's no change output, we'll have to just eat the loss
    if (transaction.outputs.length > 1) {
      const delta = transaction.inputAmount - transaction.outputAmount
      const finalSize = transaction._estimateSize() + transaction.outputs.length // Numbers are variable length in bitcoin, changing the output amount could add a byte to any given txn.
      const properFee = Math.ceil(finalSize * feePerByte)
      const amountToAdd = delta - properFee
      // Add a small amount to the current output
      console.log('Amount available', delta, 'Fee required', properFee, 'Will add', amountToAdd, 'To output #', outputIndex)
      transaction.outputs[outputIndex].satoshis += amountToAdd
      transaction._outputAmount += amountToAdd
    }

    const newIndex = shuffleArray(transaction.outputs).findIndex((v) => v === 0)

    // Sign transaction
    transaction = transaction.sign(signingKeys)
    const finalTxnSize = transaction._estimateSize()
    // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation
    console.log('size', finalTxnSize, 'outputAmount', transaction.outputAmount, 'inputAmount', transaction.inputAmount, 'delta', transaction.inputAmount - transaction.outputAmount, 'feePerByte', (transaction.inputAmount - transaction.outputAmount) / transaction._estimateSize())
    console.log(transaction)
    // Return output location
    return newIndex
  }

  _buildTransactionSetForExplicitAmount ({ amount, desiredMinimumTransactions = 2, addressGenerator, utxos, transactionOffset = 0 }) {
    let amountLeft = amount
    const transactionBundle = []
    let transactionNumber = transactionOffset

    while (amountLeft > 0) {
      const signingKeys = []
      const transaction = new Transaction()

      // Case 1: UTXO is bigger than amountLeft + fees.  Done.
      // Case 3: UTXO is bigger than amountLeft, but smaller than amountLeft + fees
      //    Need to decide how to fragment.  Can we fragment without making dust?
      //     If we would need to make dust, then don't use this UTXO (or, add another UTXO also)
      //     Split UTXO by sending some amount to a new address, and some to change.
      // Case 2: UTXO is smaller than amountLeft + fees.  Need to loop again
      let satoshis = 0
      const stagedUtxos = []
      while (true) {
        // We would ideally like to find a UTXO that is larger than the amount left, minus the amounts of all the other UTXOs we have added thus far to this transaction
        // additinoally we need to include the size of the output and the fees.
        const requisiteSize = (Math.min(amountLeft, Math.ceil(amount / desiredMinimumTransactions)) - satoshis) +
          (transaction._estimateSize() + 1 * standardUtxoSize + standardInputSize) * feePerByte
        if (utxos.length === 0) {
          throw new RangeError('out of utxos, unable to construct transaction set')
        }
        console.log(`requisiteSize == ${requisiteSize}`)
        const smallerUtxos = utxos.filter((a) => a.satoshis <= Math.max(minimumOutputAmount, requisiteSize))
        // Use the biggest UTXO smaller than the amount we're trying to build,
        // or use the smallest UTXO if we don't have a "greatest lower bound" utxo
        const utxoToUse = smallerUtxos.length !== 0 ? smallerUtxos[smallerUtxos.length - 1] : utxos[0]
        const usedUtxoId = calcId(utxoToUse)
        // Remove UTXO from available set
        utxos.splice(utxos.findIndex(utxo => calcId(utxo) === usedUtxoId), 1)
        stagedUtxos.push(utxoToUse)
        utxoToUse.script = Script.buildPublicKeyHashOut(utxoToUse.address).toHex()
        transaction.from(utxoToUse)
        signingKeys.push(utxoToUse.privKey)
        const txnSize = transaction._estimateSize()
        satoshis += utxoToUse.satoshis
        // We can't generate a transaction at all yet
        if (satoshis < dustLimit + (txnSize + standardUtxoSize) * feePerByte) {
          console.log("We can't generate a transaction at all yet")
          continue
        }

        console.log(`transaction._estimateSize() + standardUtxoSize : ${txnSize} + ${standardUtxoSize}`)
        const availableAmount = satoshis - (txnSize + standardUtxoSize) * feePerByte
        // If availableAmount is the minimum, there will be no change output
        // if amountLeft is the minimum, there will need to be change.  However, the delta may be less than the dust limit
        // in which case we may want to throw this iteration away.
        const amountToUse = Math.min(amountLeft, availableAmount)
        const availableForFeesAndChange = satoshis - amountToUse
        console.log(`availableForFeesAndChange ${availableForFeesAndChange}`)
        // We subtract out the fees require to generate both the recipients output, and the posibility of change
        const availableForChange = availableForFeesAndChange - (txnSize + standardUtxoSize) * feePerByte
        console.log(`availableForChange ${availableForChange}`)
        // We have a fairly large overage (more than double fees), but we don't have enough excess to create the output
        if (availableForChange > 2 * (txnSize + standardUtxoSize) * feePerByte && availableForChange < minimumOutputAmount + standardUtxoSize * feePerByte) {
          console.log("Too much overage to drop and can't generate a change output. Add another input")
          console.log(`${availableForChange} > ${2 * minimumOutputAmount} + ${standardUtxoSize} * ${feePerByte}`)
          console.log(`${availableForChange} < ${minimumOutputAmount + standardUtxoSize * feePerByte}`)
          // Try adding another UTXO so we can generate change
          continue
        }

        // We can't generate another transaction with the amount that would be left
        // try adding another UTXO to the inputs of this one.
        const overage = amountLeft - amountToUse
        if (overage > 0 && overage < minimumOutputAmount) {
          console.log("If we made this transaction, we wouldn't be able to make another. Add another UTXO here")
          console.log(`Amount left < minimumOutputAmount: ${amountLeft - amountToUse} < ${minimumOutputAmount}`)
          continue
        }
        break
      }
      const availableAmount = satoshis - (transaction._estimateSize() + standardUtxoSize) * feePerByte
      const address = addressGenerator(transactionNumber)(0)
      const amountToUse = Math.min(amountLeft, availableAmount)
      transaction.addOutput(new Transaction.Output({
        script: Script(new Address(address)),
        satoshis: amountToUse
      }))
      // Wait until succeeding to update the transactionNumber
      transactionNumber += 1

      const stagedIds = stagedUtxos.map(utxo => calcId(utxo))
      amountLeft -= amountToUse
      const outputIndex = this.finalizeTransaction({ transaction, signingKeys })
      transactionBundle.push({
        transaction,
        vouts: [outputIndex],
        usedIds: stagedIds
      })
    }
    return transactionBundle
  }

  constructTransactionSet ({ addressGenerator, amount }) {
    // Don't use frozen utxos.
    const utxos = [...this.storage.getOutpoints().values()].filter(utxo => !utxo.frozen)
    utxos.sort((a, b) => a.satoshis - b.satoshis)
    // Coin selection
    const transactionBundle = []
    let amountLeft = amount
    const calcAmounts = (splits, amount) => {
      const splitPoints = []
      let amountLeft = amount
      assert(splits > 0, 'transaction set split number invalid')
      while (splitPoints.length < splits - 1) {
        const splitPoint = Math.floor(Math.random() * (amountLeft - 2 * minimumOutputAmount)) + minimumOutputAmount
        if (splitPoint < minimumOutputAmount) {
          break
        }
        splitPoints.push(splitPoint)
        amountLeft -= splitPoint
      }
      splitPoints.push(amountLeft)
      return splitPoints
    }

    const amounts = calcAmounts(2, amountLeft)
    const totalSegments = amounts.reduce((total, amount) => total + amount, 0)
    assert(totalSegments === amount, `${totalSegments} != ${amount}`)

    // We re-wrap the transaction set builder so we can ensure the amount is split, in addition to each amount operating independently.
    for (const amountToBuild of amounts) {
      transactionBundle.push(...this._buildTransactionSetForExplicitAmount({ addressGenerator, amount: amountToBuild, utxos, transactionOffset: transactionBundle.length }))
      amountLeft -= amountToBuild
    }
    for (const transaction of transactionBundle) {
      transaction.usedIds.forEach(utxoId => this.storage.freezeOutpoint(utxoId))
    }
    return transactionBundle
  }

  async constructTransaction ({ outputs }) {
    let transaction = new Transaction()

    // Add outputs
    for (const i in outputs) {
      const output = outputs[i]
      transaction = transaction.addOutput(output)
    }

    // Coin selection
    const signingKeys = []
    const usedUtxos = []

    const amountRequired = transaction.outputAmount
    const utxos = [...this.storage.getOutpoints().values()]

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
      utxo.script = Script.buildPublicKeyHashOut(address).toHex()
      // Grab private key
      signingKeys.push(utxo.privKey)
      transaction = transaction.from(utxo)
      satoshis += utxo.satoshis
    }

    if (satoshis < amountRequired) {
      throw Error('insufficient funds')
    }

    await Promise.all(usedUtxos.map(
      utxo => this.storage.freezeOutpoint(calcId(utxo))
    ))

    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.

    // A good round number greater than the current dustLimit.
    // We may want to make it some computed value in the future.
    this.finalizeTransaction({ transaction, signingKeys })
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

  get myAddress () {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey.toAddress(this.networkName)
  }

  get myAddressStr () {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey.toAddress(this.networkName)
      .toCashAddress()
  }

  get displayAddress () {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey.toAddress(this.displayNetworkName)
      .toCashAddress()
  }

  get allAddresses () {
    return { ...this.addresses, ...this.changeAddresses }
  }

  get privKeys () {
    return Object.freeze(Object.values(this.addresses).map(address => Object.freeze(address.privKey)))
  }

  unfreezeOutpoint (id) {
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.unfreezeOutpoint(id)
  }

  putOutpoint (utxo) {
    assert(utxo.type !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.privKey !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.address !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.satoshis !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.txId !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.outputIndex !== undefined, 'putOupoint utxo wrong format')
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.putOutpoint(utxo)
  }

  async deleteOutpoint (id) {
    const outpoint = await this.storage.getOutpoint(id)
    if (!outpoint) {
      console.log(id, 'missing from UTXO set?')
      return
    }
    // TODO: Nobody should be calling this outside of the wallet
    await this.storage.deleteOutpoint(id)
  }

  // Warning, this should only be used during initial setup to ensure the
  // levelDB database has been cleared.
  // This needs to happen when the seed has potentially changed after
  // the UTXOs have been refreshed.
  async clearUtxos () {
    const outpoints = await this.storage.getOutpoints()
    for (const [outpointId] of outpoints) {
      this.deleteOutpoint(outpointId)
    }
  }
}
