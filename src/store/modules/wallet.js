import Vue from 'vue'
import assert from 'assert'

import { numAddresses, numChangeAddresses } from '../../utils/constants'

import formatting from '../../utils/formatting'
import { calcId } from '../../utils/wallet'

const cashlib = require('bitcore-lib-cash')

export default {
  namespaced: true,
  state: {
    xPrivKey: null,
    identityPrivKey: null,
    electrumScriptHashes: {},
    addresses: {},
    changeAddresses: {},
    utxos: {},
    frozenUTXOs: {},
    feeInfo: {
      feePerByte: 2,
      lastUpdate: 0
    },
    seedPhrase: null
  },
  mutations: {
    setSeedPhrase (state, seedPhrase) {
      state.seedPhrase = seedPhrase
    },
    addElectrumScriptHash (state, { scriptHash, address, change }) {
      Vue.set(state.electrumScriptHashes, scriptHash, { address, change })
    },
    reset (state) {
      state.xPrivKey = null
      state.identityPrivKey = null
      state.electrumScriptHashes = {}
      state.addresses = {}
      state.changeAddresses = {}
      state.utxos = {}
      state.frozenUTXOs = {}
      state.feeInfo = {
        feePerByte: 2,
        lastUpdate: 0
      }
    },
    setAddress (state, { address, privKey }) {
      Vue.set(state.addresses, address, { privKey })
    },
    setChangeAddress (state, { address, privKey }) {
      Vue.set(state.changeAddresses, address, { privKey })
    },
    setXPrivKey (state, xPrivKey) {
      state.xPrivKey = xPrivKey
      state.identityPrivKey = xPrivKey.deriveChild(20102019)
        .deriveChild(0, true)
        .privateKey // TODO: Proper path for this
    },
    rehydrate (state) {
      if (state.xPrivKey != null) {
        state.xPrivKey = cashlib.HDPrivateKey.fromObject(state.xPrivKey)
        state.identityPrivKey = cashlib.PrivateKey.fromObject(state.identityPrivKey)
        for (let addr in state.addresses) {
          Vue.set(state.addresses[addr], 'privKey', cashlib.PrivateKey.fromObject(state.addresses[addr].privKey))
        }
        for (let addr in state.changeAddresses) {
          Vue.set(state.changeAddresses[addr], 'privKey', cashlib.PrivateKey.fromObject(state.changeAddresses[addr].privKey))
        }
        for (const utxo of Object.values(state.utxos)) {
          if (utxo.type === 'p2pkh') {
            // Does not keep it's privKey with it because we like edge cases.
            continue
          }
          Vue.set(utxo, 'address', cashlib.Address.fromObject(utxo.address.valueOf()))
          Vue.set(utxo, 'privKey', cashlib.PrivateKey.fromObject(utxo.privKey.valueOf()))
        }
        for (const utxo of Object.values(state.frozenUTXOs)) {
          if (utxo.type === 'p2pkh') {
            // Does not keep it's privKey with it because we like edge cases.
            continue
          }
          Vue.set(utxo, 'address', cashlib.Address.fromObject(utxo.address.valueOf()))
          Vue.set(utxo, 'privKey', cashlib.PrivateKey.fromObject(utxo.privKey.valueOf()))
        }
      }
    },
    refreshUTXOsByAddr (state, { addr, outputs }) {
      // Delete all utxos by address
      Object.entries(state.utxos).forEach(entry => {
        if (entry[1].address === addr) {
          Vue.delete(state.utxos, entry[0])
        }
      })

      let frozenIds = Object.keys(state.frozenUTXOs)
      let newFrozen = []
      outputs.forEach(output => {
        let id = calcId(output)
        if (frozenIds.includes(id)) {
          newFrozen.push({ id, output })
        } else {
          Vue.set(state.utxos, calcId(output), output)
        }
      })

      // Remove all frozen utxos by address
      Object.entries(state.frozenUTXOs).forEach(entry => {
        if (entry[1].address === addr) {
          Vue.delete(state.frozenUTXOs, entry[0])
        }
      })

      // Refreeze UTXOs
      newFrozen.forEach(res => {
        Vue.set(state.frozenUTXOs, res.id, res.output)
      })
    },
    removeUTXO (state, id) {
      Vue.delete(state.utxos, id)
    },
    removeFrozenUTXO (state, id) {
      Vue.delete(state.frozenUTXOs, id)
    },
    addUTXO (state, output) {
      Vue.set(state.utxos, calcId(output), output)
    },
    freezeUTXO (state, id) {
      let frozenUTXO = state.utxos[id]
      Vue.delete(state.utxos, id)
      Vue.set(state.frozenUTXOs, id, frozenUTXO)
    },
    unfreezeUTXO (state, id) {
      let utxo = state.frozenUTXOs[id]
      Vue.delete(state.frozenUTXOs, id)
      Vue.set(state.utxos, id, utxo)
    },
    popFreezeUTXO (state, result) {
      // Freeze output and simulatenously return it
      let ids = Object.keys(state.utxos)
      if (ids.length === 0) {
        return
      }
      let lastId = ids[ids.length - 1]

      // Freeze UTXO
      let frozenUTXO = state.utxos[lastId]
      Vue.delete(state.utxos, lastId)
      Vue.set(state.frozenUTXOs, lastId, frozenUTXO)

      // Return result
      result.id = lastId
      result.utxo = frozenUTXO
    },
    setFeeInfo (state, feeInfo) {
      state.feeInfo = feeInfo
    }
  },
  actions: {
    unfreezeUTXO ({ commit }, id) {
      commit('unfreezeUTXO', id)
    },
    removeFrozenUTXO ({ commit }, id) {
      commit('removeFrozenUTXO', id)
    },
    setSeedPhrase ({ commit }, seedPhrase) {
      commit('setSeedPhrase', seedPhrase)
    },
    reset ({ commit }) {
      commit('reset')
    },
    rehydrate ({ commit }) {
      commit('rehydrate')
    },
    // TODO: Set callbacks
    setXPrivKey ({ commit }, xPrivKey) {
      commit('setXPrivKey', xPrivKey)
    },
    initAddresses ({ commit, getters }) {
      let xPrivKey = getters['getXPrivKey']
      for (var i = 0; i < numAddresses; i++) {
        let privKey = xPrivKey.deriveChild(44, true)
          .deriveChild(145, true)
          .deriveChild(0, true)
          .deriveChild(0)
          .deriveChild(i)
          .privateKey
        let address = privKey.toAddress('testnet').toLegacyAddress()
        commit('setAddress', { address, privKey })

        // Index by script hash
        let scriptHash = formatting.toElectrumScriptHash(address)
        commit('addElectrumScriptHash', { scriptHash, address, change: false })
      }
      for (var j = 0; j < numChangeAddresses; j++) {
        let privKey = xPrivKey.deriveChild(44, true)
          .deriveChild(145, true)
          .deriveChild(0, true)
          .deriveChild(1)
          .deriveChild(j)
          .privateKey
        let address = privKey.toAddress('testnet').toLegacyAddress()
        commit('setChangeAddress', { address, privKey })

        // Index by script hash
        let scriptHash = formatting.toElectrumScriptHash(address)
        commit('addElectrumScriptHash', { scriptHash, address, change: true })
      }
    },
    async updateUTXOFromScriptHash ({ commit, rootGetters, getters }, scriptHash) {
      let client = rootGetters['electrumHandler/getClient']
      try {
        var elOutputs = await client.methods.blockchain_scripthash_listunspent(scriptHash)
        let { address } = getters['getAddressByElectrumScriptHash'](scriptHash)
        let outputs = elOutputs.map(elOutput => {
          let output = {
            txId: elOutput.tx_hash,
            outputIndex: elOutput.tx_pos,
            satoshis: elOutput.value,
            type: 'p2pkh',
            address
          }
          return output
        })
        commit('refreshUTXOsByAddr', { addr: address, outputs })
      } catch (err) {
        console.error('error deserializing utxo address', err, scriptHash)
      }
    },
    async updateHDUTXOs ({ getters, dispatch }) {
      // Check HD Wallet
      let scriptHashes = Object.keys(getters['getElectrumScriptHashes'])
      await Promise
        .all(scriptHashes.map(scriptHash => dispatch('updateUTXOFromScriptHash', scriptHash)))
    },
    async fixFrozenUTXO ({ getters, rootGetters, dispatch }, id) {
      // Unfreeze UTXO if confirmed to be unspent else delete
      // WARNING: This is not thread-safe, do not call when others hold the UTXO
      let client = rootGetters['electrumHandler/getClient']
      let utxo = getters['getFrozenUTXO'](id)
      try {
        let scriptHash = formatting.toElectrumScriptHash(utxo.address)
        let elOutputs = await client.methods.blockchain_scripthash_listunspent(scriptHash)
        if (elOutputs.some(output => {
          return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
        })) {
          // Found utxo
          dispatch('unfreezeUTXO', id)
        } else {
          dispatch('removeFrozenUTXO', id)
        }
      } catch (err) {
        console.error('error deserializing utxo address', err, utxo)
      }
    },
    async fixFrozenUTXOs ({ dispatch, getters, rootGetters }) {
      // Unfreeze UTXO if confirmed to be unspent else delete, for all frozen UTXOs
      // WARNING: This is not thread-safe, do not call when others hold the UTXO
      let client = rootGetters['electrumHandler/getClient']
      let frozenUTXOs = getters['getFrozenUTXOs']
      await Promise.all(Object.keys(frozenUTXOs).map(async id => {
        let utxo = frozenUTXOs[id]
        try {
          let scriptHash = formatting.toElectrumScriptHash(utxo.address.valueOf())
          let elOutputs = await client.methods.blockchain_scripthash_listunspent(scriptHash)
          if (elOutputs.some(output => {
            return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
          })) {
            // Found utxo
            dispatch('unfreezeUTXO', id)
          } else {
            dispatch('removeFrozenUTXO', id)
          }
        } catch (err) {
          console.error('error deserializing utxo address', err, utxo)
        }
      }))
    },
    async fixUTXOs ({ dispatch, getters, rootGetters }) {
      // Unfreeze UTXO if confirmed to be unspent else delete, for all (non-p2pkh) UTXOs
      // WARNING: This is not thread-safe, do not call when others hold the UTXO
      let client = rootGetters['electrumHandler/getClient']
      let utxos = getters['getUTXOs']
      await Promise.all(Object.keys(utxos).map(async id => {
        let utxo = utxos[id]
        if (utxo.type !== 'p2pkh') {
          try {
            let scriptHash = formatting.toElectrumScriptHash(utxo.address)
            let elOutputs = await client.methods.blockchain_scripthash_listunspent(scriptHash)
            if (!elOutputs.some(output => {
              return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
            })) {
              // No such utxo
              dispatch('removeUTXO', id)
            }
          } catch (err) {
            console.error('error deserializing utxo address', err, utxo)
          }
        }
      }))
    },
    addUTXO ({ commit }, output) {
      commit('addUTXO', output)
    },
    removeUTXO ({ commit }, id) {
      commit('removeUTXO', id)
    },
    async startListeners ({ dispatch, rootGetters }, addresses) {
      let ecl = rootGetters['electrumHandler/getClient']
      await ecl.events.on(
        'blockchain.scripthash.subscribe',
        async (result) => {
          let scriptHash = result[0]
          await dispatch('updateUTXOFromScriptHash', scriptHash)
        })
      await Promise.all(addresses.map(addr => {
        let scriptHash = cashlib.Script.buildPublicKeyHashOut(addr)
        let scriptHashRaw = scriptHash.toBuffer()
        let digest = cashlib.crypto.Hash.sha256(scriptHashRaw)
        let digestHexReversed = digest.reverse().toString('hex')
        ecl.methods.blockchain_scripthash_subscribe(digestHexReversed)
      }))
    },
    constructTransaction ({ commit, getters }, { outputs, feePerByte }) {
      let transaction = new cashlib.Transaction()

      // Add outputs
      for (let i in outputs) {
        let output = outputs[i]
        transaction = transaction.addOutput(output)
      }

      // Coin selection
      let addresses = getters['getAllAddresses']

      let signingKeys = []
      let usedIDs = []
      while (true) {
        // Atomically pop item and freeze it
        let result = {}
        commit('popFreezeUTXO', result)

        // Throw error if no UTXO found
        if (Object.entries(result).length === 0) {
          // Unfreeze all UTXOs
          usedIDs.forEach(id => {
            commit('unfreezeUTXO', id)
          })
          throw Error('insufficient funds')
        }
        let { id, utxo } = result
        usedIDs.push(id)
        console.log(utxo)

        let addr = utxo.address
        utxo['script'] = cashlib.Script.buildPublicKeyHashOut(addr).toHex()
        // Grab private key
        if (utxo.type === 'p2pkh') {
          signingKeys.push(addresses[addr].privKey)
        } else {
          signingKeys.push(utxo.privKey)
        }
        transaction = transaction.from(utxo)

        // Ensure there are enough fees to cover at least one change output
        let totalFees = (transaction._estimateSize() + 34) * feePerByte
        if (transaction.outputAmount + totalFees < transaction.inputAmount) {
          break
        }
      }

      // Add change outputs using our HD wallet.  We want multiple outputs following a
      // power distribution, so we don't have to combine lots of outputs at later times
      // in order to create specific amounts.

      const standardUtxoSize = 35 // 1 extra byte because we don't want to underrun
      // A good round number greater than the current dustLimit.
      // We may want to make it some computed value in the future.
      const minimumOutputAmount = 1024
      let changeAddresses = Object.keys(getters['getChangeAddresses'])

      for (const changeAddress of changeAddresses) {
        const delta = transaction.inputAmount - transaction.outputAmount
        const size = transaction._estimateSize()
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
      // NOTE: we don't change the number of outputs here, but we also don't want to execute anythign if there are no outputs
      while (transaction.outputs.length > 0) {
        outputIndex = (outputIndex + 1) % transaction.outputs.length
        const output = transaction.outputs[outputIndex]
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
      return { transaction, usedIDs }
    },
    async getFee ({ commit, getters, rootGetters }) {
      return 2
    }
  },
  getters: {
    getSeedPhrase (state) {
      return state.seedPhrase
    },
    getFeeInfo (state) {
      return state.feeInfo
    },
    getElectrumScriptHashes (state) {
      return state.electrumScriptHashes
    },
    getAddressByElectrumScriptHash: (state) => (scriptHash) => {
      return state.electrumScriptHashes[scriptHash]
    },
    getBalance (state) {
      return Object.values(state.utxos).reduce((acc, output) => acc + output.satoshis, 0)
    },
    getIdentityPrivKey (state) {
      return state.identityPrivKey
    },
    getPaymentAddress: (state) => (seqNum) => {
      return Object.keys(state.addresses)[seqNum]
    },
    getMyAddress (state) {
      return state.identityPrivKey.toAddress(
        'testnet') // TODO: Not just testnet
    },
    getMyAddressStr (state) {
      return state.identityPrivKey.toAddress('testnet')
        .toCashAddress() // TODO: Not just testnet
    },
    getAddresses (state) {
      return state.addresses
    },
    getChangeAddresses (state) {
      return state.changeAddresses
    },
    getAllAddresses (state) {
      return { ...state.addresses, ...state.changeAddresses }
    },
    getXPrivKey (state) {
      return state.xPrivKey
    },
    getUTXOs (state) {
      return state.utxos
    },
    getFrozenUTXOs (state) {
      return state.frozenUTXOs
    },
    getUTXO (state, id) {
      return state.utxos[id]
    },
    getFrozenUTXO: (state) => (id) => {
      return state.frozenUTXOs[id]
    },
    generatePrivKey: (state) => (count) => {
      return Object.values(state.addresses)[count].privKey
    }
  }
}
