import P from 'bluebird'
import assert from 'assert'

import { calcUtxoId } from './helpers'

import {
  Address,
  Script,
  Transaction,
  PrivateKey,
  HDPrivateKey,
  PublicKey,
} from 'bitcore-lib-xpi'
import { UtxoStore } from './storage/storage'

import { Utxo } from '../types/utxo'
import { ChronikClient, SubscribeMsg, WsEndpoint } from 'chronik-client'

const standardUtxoSize = 34
const standardInputSize = 175 // A few extra bytes
const minimumNewInputAmount = 5120
const dustLimit = 1000 // Dust relay fee is 1000 in lotusd
const minFeePerByte = 2
const maxFeePerByte = 3
// Don't build transactions larger than this
const maximumTransactionSize = 100000

// TODO: This function needs a test.
function shuffleArray(arr: unknown[]) {
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

type PrivateKeyData = { privKey: PrivateKey }
type AddressData = { address: string; change: boolean } & PrivateKeyData
type AddressGenerator = (txnNumber: number) => (output: number) => PublicKey
// UnspendOutpout.fromObject can work with this
type BuildableUtxo = Utxo & { script?: string }

export class Wallet {
  storage: UtxoStore
  networkName: string
  numAddresses: number
  numChangeAddresses: number
  chronikClient: ChronikClient | undefined
  chronikWs: WsEndpoint | undefined
  _xPrivKey: HDPrivateKey | undefined
  _identityPrivKey: PrivateKey | undefined
  walletKeys: PrivateKeyData[] = []
  changeKeys: PrivateKeyData[] = []
  addressDataByPkh: Map<string, AddressData> = new Map()
  txIdHandled: Set<string> = new Set()

  constructor(
    storage: UtxoStore,
    {
      networkName = 'livenet',
      numAddresses = 20,
      numChangeAddresses = 20,
    } = {},
  ) {
    this.storage = storage
    this.networkName = networkName
    this.numAddresses = numAddresses
    this.numChangeAddresses = numChangeAddresses
  }

  setChronik({
    chronikClient,
    chronikWs,
  }: {
    chronikClient: ChronikClient
    chronikWs: WsEndpoint
  }) {
    this.chronikClient = chronikClient
    this.chronikWs = chronikWs
  }

  setXPrivKey(xPrivKey: HDPrivateKey) {
    this._xPrivKey = xPrivKey
    // TODO: we're just using the first key in the HD addresses for now
    // so that it'll be compatible (mostly) with other HD wallets.
    // We should do something to allow revocations in the future.
    this._identityPrivKey = xPrivKey
      .deriveChild(44, true)
      .deriveChild(899, true)
      .deriveChild(0, true)
      .deriveChild(0)
      .deriveChild(0).privateKey

    this.init()
  }

  async init() {
    console.log('initializing wallet')
    if (!this.xPrivKey) {
      return
    }
    this.txIdHandled = new Set()
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

  get xPrivKey() {
    return this._xPrivKey
  }

  get identityPrivKey() {
    return this._identityPrivKey
  }

  initAddresses() {
    const xPrivKey = this.xPrivKey
    assert(xPrivKey, 'xPrivKey undefined while calling wallet initialization')

    this.walletKeys = []
    this.changeKeys = []
    this.addressDataByPkh = new Map()
    for (let i = 0; i < this.numAddresses; i++) {
      const privKey = xPrivKey
        .deriveChild(44, true)
        .deriveChild(899, true)
        .deriveChild(0, true)
        .deriveChild(0)
        .deriveChild(i).privateKey
      this.walletKeys.push({ privKey })
      this.addAddressData({ privKey, change: false })
    }
    for (let j = 0; j < this.numChangeAddresses; j++) {
      const privKey = xPrivKey
        .deriveChild(44, true)
        .deriveChild(899, true)
        .deriveChild(0, true)
        .deriveChild(1)
        .deriveChild(j).privateKey
      this.changeKeys.push({ privKey })
      this.addAddressData({ privKey, change: true })
    }
  }

  addAddressData({
    privKey,
    change,
  }: {
    privKey: PrivateKey
    change: boolean
  }) {
    const address = privKey.toAddress(this.networkName)
    const pkh = address.hashBuffer.toString('hex')
    this.addressDataByPkh.set(pkh, {
      address: address.toXAddress(),
      change,
      privKey,
    })
  }

  async refreshUTXOsByAddr({
    address,
    utxos,
  }: {
    address: string
    utxos: Utxo[]
  }) {
    const ids = utxos.map(output => calcUtxoId(output))
    const foundIds = []

    // Remove missing utxos
    const utxoMap = this.storage.getUtxoMap()
    for (const [utxoId, utxo] of utxoMap) {
      if (utxo.address !== address) {
        continue
      }
      const index = ids.indexOf(utxoId)
      foundIds.push(utxoId)
      if (index !== -1) {
        continue
      }
      ids.splice(index, 1)
      this.deleteUtxo(utxoId)
    }

    // Add new unspent UTXO
    for (const utxo of utxos) {
      const utxoId = calcUtxoId(utxo)
      if (foundIds.includes(utxoId)) {
        continue
      }
      this.putUtxo(utxo)
    }
  }

  async updateUTXOsFromTxid(txid: string) {
    // FIXME: Chronik sends out subscription hits on the same txid multiple
    // times if there are multiple addresses on it that you've subscribed to. it
    // causes a bunch of log spam. We don't need to handle them multiple times.
    if (this.txIdHandled.has(txid)) {
      return
    }
    this.txIdHandled.add(txid)
    try {
      const chronikClient = this.chronikClient
      assert(chronikClient, 'missing client in updateUTXOsFromTxid')
      const tx = await chronikClient.tx(txid)
      // Add new outputs that we subscribed tol
      for (const [outIdx, txOutput] of tx.outputs.entries()) {
        const script = new Script(txOutput.outputScript)
        if (!script.isPublicKeyHashOut()) {
          continue
        }
        const pkh = script.getPublicKeyHash().toString('hex')
        if (!this.addressDataByPkh.has(pkh)) {
          continue
        }
        const addressData = this.addressDataByPkh.get(pkh)
        assert(addressData, `missing addressData for pkh ${pkh}`)
        const utxo: Utxo = {
          txId: txid,
          outputIndex: outIdx,
          satoshis: Number(txOutput.value),
          type: 'p2pkh',
          address: addressData.address,
          privKey: addressData.privKey,
        }
        this.putUtxo(utxo)
      }

      // Delete spent inputs
      for (const txInput of tx.inputs) {
        const script = new Script(txInput.outputScript)
        if (!script.isPublicKeyHashOut()) {
          continue
        }
        const pkh = script.getPublicKeyHash().toString('hex')
        if (!this.addressDataByPkh.has(pkh)) {
          continue
        }
        const addressData = this.addressDataByPkh.get(pkh)
        assert(addressData, `missing addressData for pkh ${pkh}`)
        const utxo: Utxo = {
          txId: txInput.prevOut.txid,
          outputIndex: txInput.prevOut.outIdx,
          satoshis: Number(txInput.value),
          type: 'p2pkh',
          address: addressData.address,
          privKey: addressData.privKey,
        }
        const utxoId = calcUtxoId(utxo)
        this.deleteUtxo(utxoId)
      }
    } catch (err) {
      // make sure we clean up incase we fail and need to run this again.
      this.txIdHandled.delete(txid)
      throw err
    }
  }

  async updateUTXOsFromPkh(pkh: string) {
    const chronikClient = this.chronikClient
    assert(chronikClient, 'missing client in updateUTXOsFromScriptHash')
    try {
      const addressData = this.addressDataByPkh.get(pkh)
      assert(addressData, `missing addressData for pkh ${pkh}`)
      const chronikUtxos = await chronikClient.script('p2pkh', pkh).utxos()
      const utxos: Utxo[] = chronikUtxos.flatMap(scriptUtxos => {
        return scriptUtxos.utxos.map(utxo => ({
          txId: utxo.outpoint.txid,
          outputIndex: utxo.outpoint.outIdx,
          satoshis: Number(utxo.value),
          type: 'p2pkh',
          address: addressData.address,
          privKey: addressData.privKey,
        }))
      })
      await this.refreshUTXOsByAddr({ address: addressData.address, utxos })
    } catch (err) {
      console.error('error in updateUTXOsFromPkh', err, pkh)
    }
  }

  async updateHDUTXOs() {
    // Check HD Wallet
    await P.map(
      this.addressDataByPkh.keys(),
      pkh => this.updateUTXOsFromPkh(pkh),
      { concurrency: 5 },
    )
  }

  async startListeners() {
    const chronikWs = this.chronikWs
    assert(chronikWs, 'missing WebSocket client in startListeners')

    chronikWs.onMessage = msg => this.addressUpdated(msg)

    await P.map(
      [...this.walletKeys, ...this.changeKeys],
      key =>
        chronikWs.subscribe(
          'p2pkh',
          key.privKey.toAddress().hashBuffer.toString('hex'),
        ),
      { concurrency: 5 },
    )
  }

  async updateAllOutpoints() {
    // Check HD Wallet
    const utxos = [...this.storage.getUtxoMap().values()]
    await this.fixUtxos(utxos)
  }

  async checkAndFixUtxos(utxos: Utxo[], unfreeze = false): Promise<boolean[]> {
    const utxoIds = utxos.map(calcUtxoId)
    console.log(`Checking UTXOs ${utxoIds}`)
    const chronikClient = this.chronikClient
    assert(chronikClient, 'missing client in checkAndFixUtxos')
    const utxoStates = await chronikClient.validateUtxos(
      utxos.map(utxo => ({
        txid: utxo.txId,
        outIdx: utxo.outputIndex,
      })),
    )
    return utxoStates.map((utxoState, idx) => {
      const utxoId = utxoIds[idx]
      switch (utxoState.state) {
        case 'UNSPENT':
          console.log('UTXO is valid', utxoId)
          if (unfreeze) {
            this.unfreezeUtxo(utxoId)
          }
          return true
        case 'SPENT':
          console.log('UTXO spent on-chain, deleting spent UTXO', utxoId)
          break
        case 'NO_SUCH_TX':
          console.log(
            'Invalid UTXO: tx does not exist on-chain, deleting invalid UTXO',
            utxoId,
          )
          break
        case 'NO_SUCH_OUTPUT':
          console.log(
            "Invalid UTXO: tx exists, but output doesn't, deleting invalid UTXO",
            utxoIds[idx],
          )
          break
      }
      this.storage.deleteById(utxoId)
      return false
    })
  }

  async fixUtxos(utxos: Utxo[]) {
    // TODO: This needs some thought to ensure we do not delete outpoints that
    // are possibly just out of sync with the mempool.
    const utxoIds = utxos.map(calcUtxoId)
    try {
      // Unfreeze UTXO if confirmed to be unspent else delete
      // WARNING: This is not thread-safe, do not call when others hold the UTXO
      const storageUtxos = utxoIds.flatMap(utxoId => {
        const utxo = this.storage.getById(utxoId)
        if (utxo === undefined) {
          console.log(`Missing UTXO for ${utxoId}`)
          return []
        }
        return [utxo]
      })
      const utxosAreUnspent = await this.checkAndFixUtxos(storageUtxos)
      utxosAreUnspent.forEach((isUnspent, idx) => {
        if (isUnspent) {
          this.unfreezeUtxo(utxoIds[idx])
        }
      })
    } catch (err) {
      console.error('error fixing UTXOs', err, utxoIds)
      throw err
    }
  }

  async addressUpdated(msg: SubscribeMsg) {
    switch (msg.type) {
      case 'AddedToMempool':
      case 'Confirmed':
        console.log('Subscription hit', msg)
        await this.updateUTXOsFromTxid(msg.txid)
        return
      case 'Error':
        console.error('Error from ws:', msg.errorCode, msg.msg)
        return
    }
  }

  async forwardUTXOsToPubkey({
    utxos,
    pubkey,
  }: {
    utxos: Utxo[]
    pubkey: PublicKey
  }) {
    let transaction = new Transaction()

    const signingKeys = []
    let satoshis = 0

    const stagedUtxos = []
    for (const passedInUtxo of utxos) {
      const outpoint: BuildableUtxo | undefined = this.storage.getById(
        calcUtxoId(passedInUtxo),
      )
      if (!outpoint) {
        continue
      }
      stagedUtxos.push(outpoint)
      outpoint.script = Script.buildPublicKeyHashOut(outpoint.address).toHex()
      signingKeys.push(outpoint.privKey)
      transaction = transaction.from([
        Transaction.UnspentOutput.fromObject(outpoint),
      ])
      satoshis += outpoint.satoshis
    }

    if (stagedUtxos.length === 0) {
      return { transaction: null, usedIDs: [] }
    }

    const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
    const txnSize = this._estimateSize(transaction) + standardUtxoSize
    const fees = txnSize * minFeePerByte

    transaction.addOutput(
      new Transaction.Output({
        satoshis: satoshis - fees,
        script: Script.buildPublicKeyHashOut(pubkey),
      }),
    )
    // Sign transaction
    transaction = transaction.sign(signingKeys)

    console.log('Broadcasting forwarding txn', transaction)
    const txHex = transaction.toString()
    try {
      const chronikClient = this.chronikClient
      assert(chronikClient, 'missing client in forwardUTXOsToPubkey')
      const broadcastResult = await chronikClient.broadcastTx(txHex)
      console.log('Successfully broadcast tx', broadcastResult.txid)
      // TODO: we shouldn't be dealing with this here. Leaky abstraction
      stagedUtxos.map(utxo => this.storage.deleteById(calcUtxoId(utxo)))
    } catch (err) {
      console.error(err)
      // Fix UTXOs if tx broadcast fails
      await this.fixUtxos(stagedUtxos)
      throw new Error('Error broadcasting forwarding transaction')
    }
    return { transaction, usedUtxos: stagedUtxos }
  }

  // Bitcore estimate size is horribly broken. This slightly overestimates the transaction size
  // based on the fact that there are varints in several places. This also ensure we don't underrun
  // fees.
  _estimateSize(transaction: Transaction) {
    const transactionOverHead = 4 + 9 + 9 + 4
    const maxScriptSize =
      32 /* txid */ +
      4 /* index */ +
      1 /* length */ +
      1 +
      /* push */ 73 /* signature */ +
      33 /* pubkey */ +
      4 /* sequence */
    return (
      transactionOverHead +
      transaction.outputs.length * 35 +
      transaction.inputs.length * maxScriptSize
    )
  }

  finalizeTransaction({
    transaction,
    signingKeys,
    shuffleChange = true,
  }: {
    transaction: Transaction
    signingKeys: PrivateKey[]
    shuffleChange?: boolean
  }) {
    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.
    const changeKeys = [...this.changeKeys]
    shuffleArray(changeKeys)
    const OOM = (amount: number) => Math.floor(Math.log2(amount))
    const amountOOM = OOM(transaction.outputs[0].satoshis)
    // Amount to skip
    // TODO: Still probably leaks some information about which outputs are non-change
    // NOTE: We are not using Bitcore to set change or estimate the transaction size. It's implementation is incorrect and gen
    let skipAmount = 0
    // Create change outputs randomly in decreasing orders of magnitude
    for (const changeKey of changeKeys) {
      const estimatedFutureSize =
        this._estimateSize(transaction) + standardUtxoSize
      const delta =
        transaction.inputAmount - transaction.outputAmount - skipAmount
      console.log(`Available amount for change and fees = ${delta} `)
      if (delta < dustLimit + estimatedFutureSize * minFeePerByte) {
        console.log(
          `Can't make another output given currently available funds ${delta} < ${
            dustLimit + estimatedFutureSize * minFeePerByte
          }`,
        )
        // We can't make more outputs without going over the fee.
        break
      }

      const upperBound = delta - estimatedFutureSize * minFeePerByte
      const randomSplit = Math.random() * 0.2 + 0.4
      const changeOutputAmount =
        Math.ceil(randomSplit * (upperBound - skipAmount - dustLimit)) +
        skipAmount +
        dustLimit
      if (amountOOM === OOM(changeOutputAmount)) {
        skipAmount += changeOutputAmount
        console.log(
          'Skipping change output due to same OOM as recipient amount',
        )
        continue
      }
      skipAmount = 0

      // NOTE: This may generate a relatively large amount for the fee. We *could*
      // change the output amount to be equal to the (delta - estimatedSize * feePerByte)
      // however, we will sweep it into the first output instead to generate some noise
      console.log('Generating a change UTXO for amount:', changeOutputAmount)
      // Create the output
      const output = new Transaction.Output({
        script: Script.buildPublicKeyHashOut(
          changeKey.privKey.toPublicKey(),
        ).toHex(),
        satoshis: changeOutputAmount,
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
          script: Script.buildPublicKeyHashOut(
            changeKeys[0].privKey.toPublicKey(),
          ).toHex(),
          satoshis: changeOutputAmount,
        })
        transaction = transaction.addOutput(output)
        console.log(
          'Generating one-off change output due to random output logic skipping creating any output',
          output,
        )
      }
    } else if (transaction.outputs.length > 1) {
      // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation

      // Shift any remainder to other outputs randomly
      // NOTE: we don't change the number of outputs here, but we also don't want to execute anythign if there are no outputs
      // Add any excess money back to the first (largest) change output before shuffling.
      // If there's no change output, we'll have to just eat the loss
      // Randomly pick a change output.
      const delta = transaction.inputAmount - transaction.outputAmount
      const outputIndex =
        Math.floor(Math.random() * (transaction.outputs.length - 1)) + 1
      const finalSize = this._estimateSize(transaction)
      const properFee = Math.ceil(finalSize * minFeePerByte)
      const amountToAdd = delta - properFee
      // Add a small amount to the current output
      transaction.outputs[outputIndex].satoshis += amountToAdd
      transaction._outputAmount += amountToAdd
      console.log(
        'Shuffling excess change into existing output',
        delta,
        'Fee required',
        properFee,
        'Will add',
        amountToAdd,
        'To output #',
        outputIndex,
      )
    }
    const newIndex = shuffleChange
      ? shuffleArray(transaction.outputs).findIndex(v => v === 0)
      : 0
    // Sign transaction
    transaction = transaction.sign(signingKeys)
    const finalTxnSize = this._estimateSize(transaction)
    // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation
    console.log(
      'size',
      finalTxnSize,
      'outputAmount',
      transaction.outputAmount,
      'inputAmount',
      transaction.inputAmount,
      'delta',
      transaction.inputAmount - transaction.outputAmount,
      'feePerByte',
      (transaction.inputAmount - transaction.outputAmount) /
        this._estimateSize(transaction),
    )
    console.log(transaction)
    // Return output location
    return newIndex
  }

  _buildTransactionSetForExplicitAmount({
    amount,
    desiredMinimumTransactions = 2,
    addressGenerator,
    utxos,
    transactionOffset = 0,
  }: {
    amount: number
    desiredMinimumTransactions?: number
    addressGenerator: AddressGenerator
    utxos: Utxo[]
    transactionOffset?: number
  }) {
    let amountLeft = amount
    const transactionBundle = []
    let transactionNumber = transactionOffset
    // We want to limit the section of utxos to be less than the amount divided
    // by desiredMinimumTransactions this will ensure that if transaction
    // building is working correctly, and we have the appropriate UTXOs we will
    // build more than 1 transaction.
    const maximumUsableUtxoSize = Math.max(
      Math.ceil(amount / desiredMinimumTransactions),
      minimumNewInputAmount,
    )

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
        const requisiteSize =
          Math.min(amountLeft, maximumUsableUtxoSize) -
          satoshis +
          (this._estimateSize(transaction) +
            1 * standardUtxoSize +
            standardInputSize) *
            maxFeePerByte
        if (utxos.length === 0) {
          throw new RangeError(
            'out of utxos, unable to construct transaction set',
          )
        }
        console.log(`requisiteSize == ${requisiteSize}`)
        const smallerUtxos = utxos.filter(a => a.satoshis < requisiteSize)
        // Use the biggest UTXO smaller than the amount we're trying to build,
        // or use the smallest UTXO if we don't have a "greatest lower bound" utxo
        const utxoToUse: BuildableUtxo =
          smallerUtxos.length !== 0
            ? smallerUtxos[smallerUtxos.length - 1]
            : utxos[0]
        const usedUtxoId = calcUtxoId(utxoToUse)
        // Remove UTXO from available set
        utxos.splice(
          utxos.findIndex(utxo => calcUtxoId(utxo) === usedUtxoId),
          1,
        )
        stagedUtxos.push(utxoToUse)
        utxoToUse.script = Script.buildPublicKeyHashOut(
          utxoToUse.address,
        ).toHex()
        transaction.from([Transaction.UnspentOutput.fromObject(utxoToUse)])
        signingKeys.push(utxoToUse.privKey)
        const txnSize = this._estimateSize(transaction)
        satoshis += utxoToUse.satoshis
        // We can't generate a transaction at all yet
        if (
          satoshis <
          dustLimit + (txnSize + standardUtxoSize) * minFeePerByte
        ) {
          console.log("We can't generate a transaction at all yet")
          continue
        }

        console.log(
          `transaction._estimateSize() + standardUtxoSize : ${txnSize} + ${standardUtxoSize}`,
        )
        const availableAmount =
          satoshis - (txnSize + standardUtxoSize) * minFeePerByte
        // If availableAmount is the minimum, there will be no change output
        // if amountLeft is the minimum, there will need to be change.  However, the delta may be less than the dust limit
        // in which case we may want to throw this iteration away.
        const amountToUse = Math.min(amountLeft, availableAmount)
        const availableForFeesAndChange = satoshis - amountToUse
        console.log(`availableForFeesAndChange ${availableForFeesAndChange}`)
        // We subtract out the fees require to generate both the recipients output, and the posibility of change
        const availableForChange =
          availableForFeesAndChange -
          (txnSize + standardUtxoSize) * minFeePerByte
        console.log(`availableForChange ${availableForChange}`)
        // We have a fairly large overage (more than double fees), but we don't have enough excess to create the output
        if (
          availableForChange > (txnSize + standardUtxoSize) * maxFeePerByte &&
          availableForChange < dustLimit + standardUtxoSize * minFeePerByte
        ) {
          console.log(
            "Too much overage to drop and can't generate a change output. Add another input",
          )
          console.log(
            `${availableForChange} > ${
              2 * minimumNewInputAmount
            } + ${standardUtxoSize} * ${maxFeePerByte}`,
          )
          console.log(
            `${availableForChange} < ${
              minimumNewInputAmount + standardUtxoSize * minFeePerByte
            }`,
          )
          // Try adding another UTXO so we can generate change
          continue
        }

        // We can't generate another transaction with the amount that would be left
        // try adding another UTXO to the inputs of this one.
        const overage = amountLeft - amountToUse
        if (overage > 0 && overage < minimumNewInputAmount) {
          console.log(
            "If we made this transaction, we wouldn't be able to make another. Add another UTXO here",
          )
          console.log(
            `Amount left < minimumNewInputAmount: ${
              amountLeft - amountToUse
            } < ${minimumNewInputAmount}`,
          )
          continue
        }

        break
      }
      const availableAmount =
        satoshis -
        (this._estimateSize(transaction) + standardUtxoSize) * minFeePerByte
      const address = addressGenerator(transactionNumber)(0)
      const amountToUse = Math.min(amountLeft, availableAmount)
      transaction.addOutput(
        new Transaction.Output({
          script: new Script(new Address(address)),
          satoshis: amountToUse,
        }),
      )

      // Wait until succeeding to update the transactionNumber
      transactionNumber += 1

      amountLeft -= amountToUse
      const outputIndex = this.finalizeTransaction({ transaction, signingKeys })
      // We can't make this transaction any bigger
      if (this._estimateSize(transaction) > maximumTransactionSize) {
        throw new RangeError(
          'Unable to build transaction due to overflow on transaction size',
        )
      }
      transactionBundle.push({
        transaction,
        vouts: [outputIndex],
        usedUtxos: stagedUtxos,
      })
    }
    return transactionBundle
  }

  constructTransactionSet({
    addressGenerator,
    amount,
  }: {
    addressGenerator: AddressGenerator
    amount: number
  }) {
    // Don't use frozen utxos.
    const utxos = [...this.storage.getUtxoMap().values()].filter(
      utxo => !utxo.frozen,
    )
    utxos.sort((a, b) => a.satoshis - b.satoshis)
    // Coin selection
    const transactionBundle = []

    transactionBundle.push(
      ...this._buildTransactionSetForExplicitAmount({
        amount,
        addressGenerator,
        utxos,
        transactionOffset: transactionBundle.length,
      }),
    )
    for (const transaction of transactionBundle) {
      transaction.usedUtxos.forEach(utxo => this.freezeUtxo(utxo))
    }
    return transactionBundle
  }

  constructTransaction({
    outputs,
  }: {
    outputs: Utxo[] | Transaction.Output[]
  }) {
    let transaction = new Transaction()

    // Add outputs
    for (const i in outputs) {
      const output = new Transaction.Output(outputs[i])
      transaction = transaction.addOutput(output)
    }

    // Coin selection
    const signingKeys = []

    const amountRequired = transaction.outputAmount
    const sortedUtxos: BuildableUtxo[] = [...this.storage.getUtxoMap().values()]
      .filter(utxo => !utxo.frozen)
      .sort((utxoA, utxoB) => utxoB.satoshis - utxoA.satoshis)

    const biggerUtxos = sortedUtxos.filter(
      a =>
        a.satoshis >=
        amountRequired +
          (this._estimateSize(transaction) +
            standardUtxoSize +
            standardInputSize) *
            minFeePerByte,
    )

    const utxoSetToUse =
      biggerUtxos.length !== 0
        ? [biggerUtxos[biggerUtxos.length - 1]]
        : sortedUtxos

    let satoshis = 0
    const usedUtxos = []
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
      transaction = transaction.from([
        Transaction.UnspentOutput.fromObject(utxo),
      ])
      satoshis += utxo.satoshis
    }

    if (satoshis < amountRequired) {
      throw Error('insufficient funds')
    }

    usedUtxos.map(utxo => this.storage.freezeById(calcUtxoId(utxo)))

    // Add change outputs using our HD wallet.  We want multiple outputs following a
    // power distribution, so we don't have to combine lots of outputs at later times
    // in order to create specific amounts.

    // A good round number greater than the current dustLimit.
    // We may want to make it some computed value in the future.
    this.finalizeTransaction({ transaction, signingKeys, shuffleChange: false })
    const finalTxnSize = transaction._estimateSize()
    // Sweep change into a randomly provided output.  Helps provide noise and obsfuscation
    console.log(
      'size',
      finalTxnSize,
      'outputAmount',
      transaction.outputAmount,
      'inputAmount',
      transaction.inputAmount,
      'delta',
      transaction.inputAmount - transaction.outputAmount,
      'feePerByte',
      (transaction.inputAmount - transaction.outputAmount) /
        transaction._estimateSize(),
    )
    console.log(transaction)
    return { transaction, usedUtxos }
  }

  get feePerByte() {
    return 2
  }

  get myAddress() {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey?.toAddress(this.networkName)
  }

  get displayAddress() {
    // TODO: This should be in the relay client, not the wallet...
    // TODO: Not just testnet
    return this.identityPrivKey?.toAddress(this.networkName).toXAddress()
  }

  freezeUtxo(utxo: Utxo) {
    // TODO: Nobody should be calling this outside of the wallet
    try {
      return this.storage.freezeById(calcUtxoId(utxo))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.log('non-existant utxo being unfrozen')
    }
  }

  unfreezeUtxo(id: string) {
    // TODO: Nobody should be calling this outside of the wallet
    try {
      return this.storage.unfreezeById(id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.log('non-existant utxo being unfrozen')
    }
  }

  putUtxo(utxo: Utxo) {
    assert(utxo.type !== undefined, 'putUtxo utxo wrong format')
    assert(utxo.privKey !== undefined, 'putUtxo utxo wrong format')
    assert(utxo.address !== undefined, 'putUtxo utxo wrong format')
    assert(utxo.satoshis !== undefined, 'putUtxo utxo wrong format')
    assert(utxo.txId !== undefined, 'putUtxo utxo wrong format')
    assert(utxo.outputIndex !== undefined, 'putUtxo utxo wrong format')
    // TODO: Nobody should be calling this outside of the wallet
    console.log(`adding utxo ${calcUtxoId(utxo)}`)
    return this.storage.put(utxo)
  }

  deleteUtxo(id: string) {
    console.log(`deleting utxo ${id}`)
    if (!this.storage.getById(id)) {
      console.log(`id not found in UTXO storage ${id}`)
    }
    // TODO: Nobody should be calling this outside of the wallet
    this.storage.deleteById(id)
  }

  // Warning, this should only be used during initial setup to ensure the
  // levelDB database has been cleared.
  // This needs to happen when the seed has potentially changed after
  // the UTXOs have been refreshed.
  clearUtxos() {
    this.storage.clear()
  }
}
