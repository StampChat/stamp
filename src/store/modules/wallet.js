import Vue from 'vue'
import crypto from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import { numAddresses, numChangeAddresses, feePerByte, nUtxoGoal } from '../../utils/constants'
import formatting from '../../utils/formatting'

const cashlib = require('bitcore-lib-cash')

const calcId = function (output) {
  return output.txId.slice(0, 20) + output.outputIndex
}

export default {
  namespaced: true,
  state: {
    complete: false,
    xPrivKey: null,
    identityPrivKey: null,
    electrumScriptHashes: {},
    addresses: {},
    changeAddresses: {},
    utxos: {},
    frozenUTXOs: {}
  },
  mutations: {
    addElectrumScriptHash (state, { scriptHash, address, change }) {
      Vue.set(state.electrumScriptHashes, scriptHash, { address, change })
    },
    completeSetup (state) {
      state.complete = true
    },
    reset (state) {
      state.xPrivKey = null
      state.identityPrivKey = null
      state.addresses = {}
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
    reinitialize (state) {
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
        }
        Vue.set(state.utxos, calcId(output), output)
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
      Vue.delete(state.utxos, id)
      Vue.set(state.utxos, id, utxo)
    },
    popFreezeOutput (state, result) {
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
    }
  },
  actions: {
    completeSetup ({ commit }) {
      commit('completeSetup')
    },
    reset ({ commit }) {
      commit('reset')
    },
    reinitialize ({ commit }) {
      commit('reinitialize')
    },
    // TODO: Set callbacks
    setXPrivKey ({ commit }, xPrivKey) {
      commit('setXPrivKey', xPrivKey)
    },
    initAddresses ({ commit, getters }) {
      let xPrivKey = getters['getXPrivKey']
      for (var i = 0; i < numAddresses; i++) {
        let privKey = xPrivKey.deriveChild(44)
          .deriveChild(0)
          .deriveChild(0)
          .deriveChild(0)
          .deriveChild(i, true)
          .privateKey
        let address = privKey.toAddress('testnet').toLegacyAddress()
        commit('setAddress', { address, privKey })

        // Index by script hash
        let scriptHash = formatting.toElectrumScriptHash(address)
        commit('addElectrumScriptHash', { scriptHash, address, change: false })
      }
      for (var j = 0; j < numChangeAddresses; j++) {
        let privKey = xPrivKey.deriveChild(44)
          .deriveChild(0)
          .deriveChild(0)
          .deriveChild(1)
          .deriveChild(j, true)
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
      let elOutputs = await client.blockchainScripthash_listunspent(scriptHash)
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
    async updateUTXOs ({ getters, dispatch }) {
      let scriptHashes = Object.keys(getters['getElectrumScriptHashes'])

      await Promise
        .all(scriptHashes.map(scriptHash => dispatch('updateUTXOFromScriptHash', scriptHash)))
    },
    addUTXO ({ commit }, output) {
      commit('addUTXO', output)
    },
    removeUTXO ({ commit }, id) {
      commit('removeUTXO', id)
    },
    async startListeners ({ dispatch, rootGetters }, addresses) {
      let client = rootGetters['electrumHandler/getClient']
      await client.subscribe.on(
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
        client.blockchainScripthash_subscribe(digestHexReversed)
      }))
    },
    constructTransaction ({ commit, getters, dispatch }, outputs) {
      // Collect inputs
      let addresses = getters['getAllAddresses']
      let utxos = getters['getUTXOs']

      // Construct Transaction
      let transaction = new cashlib.Transaction()

      // Add fee
      transaction = transaction.feePerByte(feePerByte)

      // Add outputs
      for (let i in outputs) {
        let output = outputs[i]
        transaction = transaction.addOutput(output)
      }

      // Coin selection
      let signingKeys = []
      let usedUTXOs = []
      while (true) {
        // Atomically pop item and freeze it
        let result = {}
        commit('popFreezeOutput', result)
        if (result === {}) {
          // TODO: Throw error because no utxo found
        }
        let { id, utxo } = result
        usedUTXOs.push(id)

        let addr = utxo.address
        utxo['script'] = cashlib.Script.buildPublicKeyHashOut(addr).toHex()

        // Grab private key
        let signingKey
        if (utxo.type === 'p2pkh') {
          signingKey = addresses[addr].privKey
        } else if (utxo.type === 'stamp') {
          let privKey = getters['getIdentityPrivKey']
          let payloadDigest = Buffer.from(utxo.payloadDigest)
          signingKey = crypto.constructStampPrivKey(payloadDigest, privKey)
        } else if (utxo.type === 'stealth') {
          let privKey = getters['getIdentityPrivKey']
          let ephemeralPubKey = PublicKey(utxo.ephemeralPubKey)
          signingKey = crypto.constructStealthPrivKey(ephemeralPubKey, privKey)
        } else {
          // TODO: Handle
        }
        transaction = transaction.from(utxo)
        signingKeys.push(signingKey)

        let totalFees = (transaction._estimateSize() + 34) * feePerByte
        if (transaction.outputAmount + totalFees < transaction.inputAmount) {
          break
        }
      }

      // Add change outputs
      let delta = transaction.inputAmount - transaction.outputAmount
      let nChangeAddresses = Math.max(Math.min(delta / (1024 + 34 * feePerByte) - 1, nUtxoGoal - Object.keys(utxos).length - 1), 0)
      let changeAddresses = Object.keys(getters['getChangeAddresses'])

      for (let i = 0; i < nChangeAddresses; i++) {
        // TODO: Randomize
        let output = new cashlib.Transaction.Output({
          script: cashlib.Script.buildPublicKeyHashOut(changeAddresses[i]).toHex(),
          satoshis: 1024
        })
        transaction = transaction.addOutput(output)
      }
      transaction = transaction.change(changeAddresses[0])

      // Sign transaction
      transaction = transaction.sign(signingKeys)
      console.log(transaction)
      console.log('feePerByte', (transaction.inputAmount - transaction.outputAmount) / transaction._estimateSize())

      return transaction
    }
  },
  getters: {
    getElectrumScriptHashes (state) {
      return state.electrumScriptHashes
    },
    getAddressByElectrumScriptHash: (state) => (scriptHash) => {
      return state.electrumScriptHashes[scriptHash]
    },
    isSetupComplete (state) {
      return state.complete
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
    generatePrivKey: (state) => (count) => {
      return Object.values(state.addresses)[count].privKey
    }
  }
}
