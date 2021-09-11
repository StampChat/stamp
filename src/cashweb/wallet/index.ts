import P from 'bluebird'
import assert from 'assert'

import { calcId } from './helpers'

import { Address, Script, Transaction, crypto, PrivateKey, HDPrivateKey, PublicKey } from 'bitcore-lib-xpi'
import { OutpointStore } from './storage/storage'
import type { ElectrumClient, RequestResponse } from 'electrum-cash'

import { Outpoint, OutpointId } from '../types/outpoint'

const standardUtxoSize = 34
const standardInputSize = 175 // A few extra bytes
const minimumNewInputAmount = 5120
const dustLimit = 546
const minFeePerByte = 2
const maxFeePerByte = 3
// Don't build transactions larger than this
const maximumTransactionSize = 100000

// TODO: This function needs a test.
function shuffleArray (arr: unknown[]) {
  const swaps = [...arr.keys()]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i)
    const temp = arr[i]
    const tempIndex = swaps[i]
    arr[i] = arr[j]
    swaps[i] = swaps[j]
    arr[j] = temp
    swaps[j] = tempIndex
  }
  return swaps
}

function toElectrumScriptHash (address: string | Address | PublicKey) {
  const scriptHash = Script.buildPublicKeyHashOut(address)
  const scriptHashRaw = scriptHash.toBuffer()
  const digest = crypto.Hash.sha256(scriptHashRaw)
  const digestHexReversed = digest.reverse().toString('hex')
  return digestHexReversed
}

type PrivateKeyData = { privKey: PrivateKey }
type AddressData = { address: string, change: boolean } & PrivateKeyData
type ElectrumScriptHash = string;
type AddressGenerator = (txnNumber: number) => (output: number) => PublicKey
// UnspendOutpout.fromObject can work with this
type BuildableOutput = Outpoint & { script?: string }
// eslint-disable-next-line camelcase, @typescript-eslint/naming-convention
type ElectrumListUnspentOutput = { tx_hash: string, tx_pos: number, value: number }

export class Wallet {
  storage: OutpointStore
  networkName: string
  numAddresses: number
  numChangeAddresses: number
  electrumClientPromise: Promise<ElectrumClient> | undefined
  _xPrivKey: HDPrivateKey | undefined
  _identityPrivKey: PrivateKey | undefined
  addresses: Record<string, PrivateKeyData | undefined> = {}
  changeAddresses: Record<string, PrivateKeyData | undefined> = {}
  electrumScriptHashes: Record<ElectrumScriptHash, AddressData> = {}

  scriptHashSubscriber: (response: Error | RequestResponse) => void;

  constructor (storage: OutpointStore, { networkName = 'livenet', numAddresses = 20, numChangeAddresses = 20 } = {}) {
    this.storage = storage
    this.networkName = networkName
    this.numAddresses = numAddresses
    this.numChangeAddresses = numChangeAddresses

    // Workaround for the way electrum-cash ensures a subscription isn't handled
    // twice.
    // Fixes: "MaxListenersExceededWarning: Possible EventEmitter memory leak
    // detected. 11 blockchain.scripthash.subscribe listeners added to
    // [ElectrumClient]. Use emitter.setMaxListeners() to increase limit"
    this.scriptHashSubscriber = this.scriptHashUpdated.bind(this)
  }

  setElectrumClient (electrumClientPromise: Promise<ElectrumClient>) {
    this.electrumClientPromise = electrumClientPromise
    this.init()
  }

  setXPrivKey (xPrivKey: HDPrivateKey) {
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
    const t0 = Date.now()
    this.initAddresses()
    const initAddressTime = Date.now()
    await this.updateHDUTXOs()
    const updateUTXOTime = Date.now()
    await this.startListeners()
    const startListenersTime = Date.now()
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
    assert(xPrivKey, 'xPrivKey undefined while calling wallet initialization')

    this.addresses = {}
    this.changeAddresses = {}
    this.electrumScriptHashes = {}
    for (let i = 0; i < this.numAddresses; i++) {
      const privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(899, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(i)
        .privateKey
      const address = privKey.toAddress(this.networkName).toXAddress()
      this.setAddress({ address, privKey })

      // Index by script hash
      const scriptHash = toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: false, privKey })
    }
    for (let j = 0; j < this.numChangeAddresses; j++) {
      const privKey = xPrivKey.deriveChild(44, true)
        .deriveChild(899, true)
        .deriveChild(0, true)
        .deriveChild(1)
        .deriveChild(j)
        .privateKey
      const address = privKey.toAddress(this.networkName).toXAddress()
      this.setChangeAddress({ address, privKey })

      // Index by script hash
      const scriptHash = toElectrumScriptHash(address)
      this.addElectrumScriptHash({ scriptHash, address, change: true, privKey })
    }
  }

  addElectrumScriptHash ({ scriptHash, address, change, privKey }: { scriptHash: string } & AddressData) {
    this.electrumScriptHashes[scriptHash] = { address, change, privKey }
  }

  setAddress ({ address, privKey }: { address: string, privKey: PrivateKey }) {
    this.addresses[address] = { privKey }
  }

  setChangeAddress ({ address, privKey }: { address: string, privKey: PrivateKey }) {
    this.changeAddresses[address] = { privKey }
  }

  async refreshUTXOsByAddr ({ address, outputs }: { address: string, outputs: Outpoint[] }) {
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

  async updateUTXOFromScriptHash (scriptHash: string) {
    const client = await this.electrumClientPromise
    assert(client, 'missing client in updateUTXOFromScriptHash')
    try {
      const elOutputs: Error | RequestResponse = await client.request('blockchain.scripthash.listunspent', scriptHash)
      assert(elOutputs, `Null response from blockchain.scripthash.listunspent for ${scriptHash}`)
      if (elOutputs instanceof Error) {
        throw elOutputs
      }
      assert(elOutputs instanceof Array, 'output of blockchain.scripthash.listunspent was not an array!')
      const unspentOutputs = elOutputs as ElectrumListUnspentOutput[]
      const addressMap = this.getAddressByElectrumScriptHash(scriptHash)
      const { address, privKey } = addressMap
      const outputs = unspentOutputs.map((elOutput: ElectrumListUnspentOutput) => {
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
    assert(client, 'missing client in startListeners')
    const scriptHashes = Object.keys(this.electrumScriptHashes)

    await P.map(scriptHashes, scriptHash => client.subscribe(this.scriptHashSubscriber, 'blockchain.scripthash.subscribe', scriptHash), { concurrency: 5 })
  }

  async fixOutpoint (utxoId: OutpointId) {
    // TODO: This needs some thought to ensure we do not delete outpoints that
    // are possibly just out of sync with the mempool.

    // Unfreeze UTXO if confirmed to be unspent else delete
    // WARNING: This is not thread-safe, do not call when others hold the UTXO
    const client = await this.electrumClientPromise
    assert(client, 'missing client in fixOutpoint')
    const utxo = await this.storage.getOutpoint(utxoId)
    if (!utxo) {
      console.log(`Missing UTXO for ${utxoId}`)
      return
    }
    console.log(`Fixing UTXO ${utxoId}`)
    try {
      const scriptHash = toElectrumScriptHash(utxo.address)
      const elOutputs = await client.request('blockchain.scripthash.listunspent', scriptHash)
      assert(elOutputs, `Null response from blockchain.scripthash.listunspent for ${scriptHash}`)
      if (elOutputs instanceof Error) {
        throw elOutputs
      }
      assert(elOutputs instanceof Array, 'output of blockchain.scripthash.listunspent was not an array!')
      const unspentOutputs = elOutputs as ElectrumListUnspentOutput[]
      if (unspentOutputs.some(output => {
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

  async scriptHashUpdated (response: RequestResponse | Error) {
    if (!(response instanceof Array)) {
      // Electrum-cash client is dumb and sends the initial subscription call response to our
      // callback handler. The data is not the same, and is actually a string with the
      // status of the particular scriptHash
      return
    }
    const params = response as [string, string] | string
    const [scriptHash, status] = params
    console.log('Subscription hit', scriptHash, status)
    await this.updateUTXOFromScriptHash(scriptHash)
  }

  async forwardUTXOsToAddress ({ utxos, address }: { utxos: Outpoint[], address: string }) {
    let transaction = new Transaction()

    const outpointIds = utxos.map(utxo => calcId(utxo))
    const signingKeys = []
    let satoshis = 0

    const usedIDs = []
    for (const outpointId of outpointIds) {
      const outpoint: BuildableOutput | undefined = this.storage.getOutpoint(outpointId)
      if (!outpoint) {
        continue
      }
      usedIDs.push(outpointId)
      outpoint.script = Script.buildPublicKeyHashOut(outpoint.address).toHex()
      signingKeys.push(outpoint.privKey)
      transaction = transaction.from([Transaction.UnspentOutput.fromObject(outpoint)])
      satoshis += outpoint.satoshis
    }

    if (usedIDs.length === 0) {
      return { transaction: null, usedIDs: [] }
    }

    const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
    const txnSize = this._estimateSize(transaction) + standardUtxoSize
    const fees = txnSize * minFeePerByte

    transaction.to(address, satoshis - fees)
    // Sign transaction
    transaction = transaction.sign(signingKeys)

    console.log('Broadcasting forwarding txn', transaction)
    const txHex = transaction.toString()
    try {
      const electrumClient = await this.electrumClientPromise
      assert(electrumClient, 'missing client in forwardUTXOsToAddress')
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

  // Bitcore estimate size is horribly broken. This slightly overestimates the transaction size
  // based on the fact that there are varints in several places. This also ensure we don't underrun
  // fees.
  _estimateSize (transaction: Transaction) {
    const transactionOverHead = 4 + 9 + 9 + 4
    const maxScriptSize = 32 /* txid */ + 4 /* index */ + 1 /* length */ + 1 + /* push */ 73 /* signature */ + 33 /* pubkey */ + 4 /* sequence */
    return transactionOverHead + transaction.outputs.length * 35 + transaction.inputs.length * maxScriptSize
  }

  finalizeTransaction ({ transaction, signingKeys, shuffleChange = true }: { transaction: Transaction, signingKeys: PrivateKey[], shuffleChange?: boolean }) {
    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.
    const changeAddresses = Object.keys(this.changeAddresses)
    shuffleArray(changeAddresses)
    const OOM = (amount: number) => Math.floor(Math.log2(amount))
    const amountOOM = OOM(transaction.outputs[0].satoshis)
    // Amount to skip
    // TODO: Still probably leaks some information about which outputs are non-change
    // NOTE: We are not using Bitcore to set change or estimate the transaction size. It's implementation is incorrect and gen
    let skipAmount = 0
    // Create change outputs randomly in decreasing orders of magnitude
    for (const changeAddress of changeAddresses) {
      const estimatedFutureSize = this._estimateSize(transaction) + standardUtxoSize
      const delta = transaction.inputAmount - transaction.outputAmount - skipAmount
      console.log(`Available amount for change and fees = ${delta}`)
      if (delta < dustLimit + estimatedFutureSize * minFeePerByte) {
        console.log(`Can't make another output given currently available funds ${delta} < ${dustLimit + estimatedFutureSize * minFeePerByte}`)
        // We can't make more outputs without going over the fee.
        break
      }

      const upperBound = delta - estimatedFutureSize * minFeePerByte
      const randomSplit = Math.random() * 0.2 + 0.4
      const changeOutputAmount = Math.ceil(randomSplit * (upperBound - skipAmount - dustLimit)) + skipAmount + dustLimit
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

    if (transaction.outputs.length === 1) {
      // If we didn't add an output due to the OOM skipping above, *and* there's
      // significant change, add a change output to avoid burning too many coins
      // and generating an absurdfee error.

      const delta = transaction.inputAmount - transaction.outputAmount
      const finalSize = this._estimateSize(transaction) + standardUtxoSize
      const properFee = Math.ceil(finalSize * minFeePerByte)
      const changeOutputAmount = delta - properFee
      if (changeOutputAmount >= minimumNewInputAmount) {
        const output = new Transaction.Output({
          script: Script.buildPublicKeyHashOut(changeAddresses[0]).toHex(),
          satoshis: changeOutputAmount
        })
        transaction = transaction.addOutput(output)
        console.log('Generating one-off change output due to random output logic skipping creating any output', output)
      }
    } else if (transaction.outputs.length > 1) {
      // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation

      // Shift any remainder to other outputs randomly
      // NOTE: we don't change the number of outputs here, but we also don't want to execute anythign if there are no outputs
      // Add any excess money back to the first (largest) change output before shuffling.
      // If there's no change output, we'll have to just eat the loss
      // Randomly pick a change output.
      const delta = transaction.inputAmount - transaction.outputAmount
      const outputIndex = Math.floor(Math.random() * (transaction.outputs.length - 1)) + 1
      const finalSize = this._estimateSize(transaction)
      const properFee = Math.ceil(finalSize * minFeePerByte)
      const amountToAdd = delta - properFee
      // Add a small amount to the current output
      transaction.outputs[outputIndex].satoshis += amountToAdd
      transaction._outputAmount += amountToAdd
      console.log('Shuffling excess change into existing output', delta, 'Fee required', properFee, 'Will add', amountToAdd, 'To output #', outputIndex)
    }
    const newIndex = shuffleChange ? shuffleArray(transaction.outputs).findIndex((v) => v === 0) : 0
    // Sign transaction
    transaction = transaction.sign(signingKeys)
    const finalTxnSize = this._estimateSize(transaction)
    // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation
    console.log('size', finalTxnSize, 'outputAmount', transaction.outputAmount, 'inputAmount', transaction.inputAmount, 'delta', transaction.inputAmount - transaction.outputAmount, 'feePerByte', (transaction.inputAmount - transaction.outputAmount) / this._estimateSize(transaction))
    console.log(transaction)
    // Return output location
    return newIndex
  }

  _buildTransactionSetForExplicitAmount ({ amount, desiredMinimumTransactions = 2, addressGenerator, utxos, transactionOffset = 0 }:
    { amount: number, desiredMinimumTransactions?: number, addressGenerator: AddressGenerator, utxos: Outpoint[], transactionOffset?: number }) {
    let amountLeft = amount
    const transactionBundle = []
    let transactionNumber = transactionOffset
    // We want to limit the section of utxos to be less than the amount divided
    // by desiredMinimumTransactions this will ensure that if transaction
    // building is working correctly, and we have the appropriate UTXOs we will
    // build more than 1 transaction.
    const maximumUsableUtxoSize = Math.max(Math.ceil(amount / desiredMinimumTransactions), minimumNewInputAmount)

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
        const requisiteSize = (Math.min(amountLeft, maximumUsableUtxoSize) - satoshis) +
          (this._estimateSize(transaction) + 1 * standardUtxoSize + standardInputSize) * maxFeePerByte
        if (utxos.length === 0) {
          throw new RangeError('out of utxos, unable to construct transaction set')
        }
        console.log(`requisiteSize == ${requisiteSize}`)
        const smallerUtxos = utxos.filter((a) => a.satoshis < requisiteSize)
        // Use the biggest UTXO smaller than the amount we're trying to build,
        // or use the smallest UTXO if we don't have a "greatest lower bound" utxo
        const utxoToUse: BuildableOutput = smallerUtxos.length !== 0 ? smallerUtxos[smallerUtxos.length - 1] : utxos[0]
        const usedUtxoId = calcId(utxoToUse)
        // Remove UTXO from available set
        utxos.splice(utxos.findIndex(utxo => calcId(utxo) === usedUtxoId), 1)
        stagedUtxos.push(utxoToUse)
        utxoToUse.script = Script.buildPublicKeyHashOut(utxoToUse.address).toHex()
        transaction.from([Transaction.UnspentOutput.fromObject(utxoToUse)])
        signingKeys.push(utxoToUse.privKey)
        const txnSize = this._estimateSize(transaction)
        satoshis += utxoToUse.satoshis
        // We can't generate a transaction at all yet
        if (satoshis < dustLimit + (txnSize + standardUtxoSize) * minFeePerByte) {
          console.log("We can't generate a transaction at all yet")
          continue
        }

        console.log(`transaction._estimateSize() + standardUtxoSize : ${txnSize} + ${standardUtxoSize}`)
        const availableAmount = satoshis - (txnSize + standardUtxoSize) * minFeePerByte
        // If availableAmount is the minimum, there will be no change output
        // if amountLeft is the minimum, there will need to be change.  However, the delta may be less than the dust limit
        // in which case we may want to throw this iteration away.
        const amountToUse = Math.min(amountLeft, availableAmount)
        const availableForFeesAndChange = satoshis - amountToUse
        console.log(`availableForFeesAndChange ${availableForFeesAndChange}`)
        // We subtract out the fees require to generate both the recipients output, and the posibility of change
        const availableForChange = availableForFeesAndChange - (txnSize + standardUtxoSize) * minFeePerByte
        console.log(`availableForChange ${availableForChange}`)
        // We have a fairly large overage (more than double fees), but we don't have enough excess to create the output
        if (availableForChange > (txnSize + standardUtxoSize) * maxFeePerByte && availableForChange < dustLimit + standardUtxoSize * minFeePerByte) {
          console.log("Too much overage to drop and can't generate a change output. Add another input")
          console.log(`${availableForChange} > ${2 * minimumNewInputAmount} + ${standardUtxoSize} * ${maxFeePerByte}`)
          console.log(`${availableForChange} < ${minimumNewInputAmount + standardUtxoSize * minFeePerByte}`)
          // Try adding another UTXO so we can generate change
          continue
        }

        // We can't generate another transaction with the amount that would be left
        // try adding another UTXO to the inputs of this one.
        const overage = amountLeft - amountToUse
        if (overage > 0 && overage < minimumNewInputAmount) {
          console.log("If we made this transaction, we wouldn't be able to make another. Add another UTXO here")
          console.log(`Amount left < minimumNewInputAmount: ${amountLeft - amountToUse} < ${minimumNewInputAmount}`)
          continue
        }

        break
      }
      const availableAmount = satoshis - (this._estimateSize(transaction) + standardUtxoSize) * minFeePerByte
      const address = addressGenerator(transactionNumber)(0)
      const amountToUse = Math.min(amountLeft, availableAmount)
      transaction.addOutput(new Transaction.Output({
        script: new Script(new Address(address)),
        satoshis: amountToUse
      }))

      // Wait until succeeding to update the transactionNumber
      transactionNumber += 1

      const stagedIds = stagedUtxos.map(utxo => calcId(utxo))
      amountLeft -= amountToUse
      const outputIndex = this.finalizeTransaction({ transaction, signingKeys })
      // We can't make this transaction any bigger
      if (this._estimateSize(transaction) > maximumTransactionSize) {
        throw new RangeError('Unable to build transaction due to overflow on transaction size')
      }
      transactionBundle.push({
        transaction,
        vouts: [outputIndex],
        usedIds: stagedIds
      })
    }
    return transactionBundle
  }

  constructTransactionSet ({ addressGenerator, amount }: { addressGenerator: AddressGenerator, amount: number }) {
    // Don't use frozen utxos.
    const utxos = [...this.storage.getOutpoints().values()].filter(utxo => !utxo.frozen)
    utxos.sort((a, b) => a.satoshis - b.satoshis)
    // Coin selection
    const transactionBundle = []

    transactionBundle.push(...this._buildTransactionSetForExplicitAmount({ amount, addressGenerator, utxos, transactionOffset: transactionBundle.length }))
    for (const transaction of transactionBundle) {
      transaction.usedIds.forEach(utxoId => this.storage.freezeOutpoint(utxoId))
    }
    return transactionBundle
  }

  constructTransaction ({ outputs }: { outputs: Outpoint[] | Transaction.Output[] }) {
    let transaction = new Transaction()

    // Add outputs
    for (const i in outputs) {
      const output = new Transaction.Output(outputs[i])
      transaction = transaction.addOutput(output)
    }

    // Coin selection
    const signingKeys = []
    const usedUtxos = []

    const amountRequired = transaction.outputAmount
    const sortedUtxos: BuildableOutput[] = [...this.storage.getOutpoints().values()]
      .sort((utxoA, utxoB) => utxoB.satoshis - utxoA.satoshis)

    const biggerUtxos = sortedUtxos.filter(
      (a) => a.satoshis >= amountRequired + (this._estimateSize(transaction) + standardUtxoSize + standardInputSize) * minFeePerByte)
    const utxoSetToUse = biggerUtxos.length !== 0 ? [biggerUtxos[biggerUtxos.length - 1]] : sortedUtxos

    let satoshis = 0
    for (const utxo of utxoSetToUse) {
      const txnSize = this._estimateSize(transaction)
      if (satoshis > amountRequired + txnSize * minFeePerByte) {
        break
      }
      usedUtxos.push(utxo)
      console.log(utxo)

      const address = utxo.address
      utxo.script = Script.buildPublicKeyHashOut(address).toHex()
      // Grab private key
      signingKeys.push(utxo.privKey)
      transaction = transaction.from([Transaction.UnspentOutput.fromObject(utxo)])
      satoshis += utxo.satoshis
    }

    if (satoshis < amountRequired) {
      throw Error('insufficient funds')
    }

    usedUtxos.map(
      utxo => this.storage.freezeOutpoint(calcId(utxo))
    )

    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.

    // A good round number greater than the current dustLimit.
    // We may want to make it some computed value in the future.
    this.finalizeTransaction({ transaction, signingKeys, shuffleChange: false })
    const finalTxnSize = transaction._estimateSize()
    // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation
    console.log('size', finalTxnSize, 'outputAmount', transaction.outputAmount, 'inputAmount', transaction.inputAmount, 'delta', transaction.inputAmount - transaction.outputAmount, 'feePerByte', (transaction.inputAmount - transaction.outputAmount) / transaction._estimateSize())
    console.log(transaction)
    return { transaction, usedIDs: usedUtxos.map(utxo => calcId(utxo)) }
  }

  get feePerByte () {
    return 2
  }

  getAddressByElectrumScriptHash (scriptHash: string) {
    return this.electrumScriptHashes[scriptHash]
  }

  getPaymentAddress (seqNum: number) {
    return Object.keys(this.addresses)[seqNum]
  }

  get myAddress () {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey?.toAddress(this.networkName)
  }

  get displayAddress () {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey?.toAddress(this.networkName)
      .toXAddress()
  }

  get allAddresses () {
    return { ...this.addresses, ...this.changeAddresses }
  }

  get privKeys () {
    const privKeys = Object.values(this.addresses).map(address => {
      assert(address, 'address is unset in get privKeys')
      return Object.freeze(address.privKey)
    })
    return Object.freeze(privKeys)
  }

  unfreezeOutpoint (id: string) {
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.unfreezeOutpoint(id)
  }

  putOutpoint (utxo: Outpoint) {
    assert(utxo.type !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.privKey !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.address !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.satoshis !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.txId !== undefined, 'putOupoint utxo wrong format')
    assert(utxo.outputIndex !== undefined, 'putOupoint utxo wrong format')
    // TODO: Nobody should be calling this outside of the wallet
    return this.storage.putOutpoint(utxo)
  }

  deleteOutpoint (id: string) {
    const outpoint = this.storage.getOutpoint(id)
    if (!outpoint) {
      console.log(id, 'missing from UTXO set?')
      return
    }
    // TODO: Nobody should be calling this outside of the wallet
    this.storage.deleteOutpoint(id)
  }

  // Warning, this should only be used during initial setup to ensure the
  // levelDB database has been cleared.
  // This needs to happen when the seed has potentially changed after
  // the UTXOs have been refreshed.
  clearUtxos () {
    const outpoints = this.storage.getOutpoints()
    for (const [outpointId] of outpoints) {
      this.deleteOutpoint(outpointId)
    }
  }
}
