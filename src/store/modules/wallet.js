import Vue from 'vue'

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
    },
    async fixFrozenUTXOs ({ dispatch, getters, rootGetters }) {
      // Unfreeze UTXO if confirmed to be unspent else delete, for all frozen UTXOs
      // WARNING: This is not thread-safe, do not call when others hold the UTXO
      let client = rootGetters['electrumHandler/getClient']
      let frozenUTXOs = getters['getFrozenUTXOs']
      await Promise.all(Object.keys(frozenUTXOs).map(async id => {
        let utxo = frozenUTXOs[id]
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
          let scriptHash = formatting.toElectrumScriptHash(utxo.address)
          let elOutputs = await client.methods.blockchain_scripthash_listunspent(scriptHash)
          if (!elOutputs.some(output => {
            return (output.tx_hash === utxo.txId) && (output.tx_pos === utxo.outputIndex)
          })) {
            // No such utxo
            dispatch('removeUTXO', id)
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

      // Add fee
      transaction = transaction.feePerByte(feePerByte)

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

      // Add change outputs
      let delta = transaction.inputAmount - transaction.outputAmount

      const changeOutputAmount = 5840 // Can pay fees a few times for a normal transaction
      const standardUtxoSize = 34
      let utxos = getters['getUTXOs'] // TODO: Make length getter
      // Create 5 sized output UTXOs up until our wallet's desired utxo limit, or how many we can afford to make, whichever is smaller.
      let changeAddresses = Object.keys(getters['getChangeAddresses'])
      let nChangeAddresses = Math.max(Math.min(delta / (changeOutputAmount + standardUtxoSize * feePerByte), 100 - Object.keys(utxos).length, changeAddresses.length), 1)

      // nChangeAddresses - 1, because we add a final change output to sweep any excess
      for (let i = 0; i < Math.min(nChangeAddresses - 1, changeAddresses.length); i++) {
        // TODO: Randomize
        let output = new cashlib.Transaction.Output({
          script: cashlib.Script.buildPublicKeyHashOut(changeAddresses[i]).toHex(),
          satoshis: changeOutputAmount
        })
        transaction = transaction.addOutput(output)
      }
      transaction = transaction.change(changeAddresses[0])

      // Sign transaction
      transaction = transaction.sign(signingKeys)
      console.log('feePerByte', (transaction.inputAmount - transaction.outputAmount) / transaction._estimateSize())
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
