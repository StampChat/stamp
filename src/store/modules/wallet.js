import Vue from 'vue'
import crypto from '../../relay/crypto'
import { PublicKey } from 'bitcore-lib-cash'
import { numAddresses, numChangeAddresses } from '../../utils/constants'
import formatting from '../../utils/formatting'

const cashlib = require('bitcore-lib-cash')

export default {
  namespaced: true,
  state: {
    complete: false,
    xPrivKey: null,
    identityPrivKey: null,
    electrumScriptHashes: {},
    addresses: {},
    changeAddresses: {},
    outputs: []
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
    setUTXOs (state, outputs) {
      state.outputs = outputs
    },
    setUTXOsByAddr (state, { addr, outputs }) {
      state.outputs = state.outputs.filter(output => output.address !== addr)
      state.outputs = state.outputs.concat(outputs)
    },
    removeUTXO (state, output) {
      state.outputs = state.outputs.filter(utxo => utxo !== output)
    },
    addUTXO (state, output) {
      state.outputs.push(output)
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
      commit('setUTXOsByAddr', { addr: address, outputs })
    },
    async updateUTXOs ({ getters, dispatch }) {
      let scriptHashes = Object.keys(getters['getElectrumScriptHashes'])

      await Promise
        .all(scriptHashes.map(scriptHash => dispatch('updateUTXOFromScriptHash', scriptHash)))
    },
    addUTXO ({ commit }, output) {
      commit('addUTXO', output)
    },
    removeUTXO ({ commit }, output) {
      commit('removeUTXO', output)
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
    constructTransaction ({ commit, getters }, outputs) {
      // Collect inputs
      let addresses = getters['getAllAddresses']
      let inputUTXOs = []
      let signingKeys = []
      let fee = 800 // TODO: Not const
      let inputValue = 0
      let utxos = getters['getUTXOs']
      let totalAmount = outputs.reduce((acc, output) => acc + output.satoshis, 0)

      // TODO: Coin selection
      for (let i in utxos) {
        let output = utxos[i]

        // Remove UTXO
        commit('removeUTXO', output)

        inputValue += output.satoshis
        let addr = output.address
        output['script'] = cashlib.Script.buildPublicKeyHashOut(addr).toHex()
        inputUTXOs.push(output)

        // Grab private key
        if (output.type === 'p2pkh') {
          let signingKey = addresses[addr].privKey
          signingKeys.push(signingKey)
        } else if (output.type === 'stamp') {
          let privKey = getters['getIdentityPrivKey']
          let payloadDigest = Uint8Array.from(output.payloadDigest)
          let signingKey = crypto.constructStampPrivKey(payloadDigest, privKey)
          signingKeys.push(signingKey)
        } else if (output.type === 'stealth') {
          let privKey = getters['getIdentityPrivKey']
          let ephemeralPubKey = PublicKey(output.ephemeralPubKey)
          let signingKey = crypto.constructStealthPrivKey(ephemeralPubKey, privKey)
          signingKeys.push(signingKey)
        } else {
          // TODO: Handle
        }

        if (totalAmount + fee < inputValue) {
          break
        }
      }

      // Construct Transaction
      let transaction = new cashlib.Transaction()

      // Add inputs
      for (let i in inputUTXOs) {
        transaction = transaction.from(inputUTXOs[i])
      }

      // Add stamp output
      for (let i in outputs) {
        let output = outputs[i]
        transaction = transaction.addOutput(output)
      }

      // Add change Output
      // TODO: Better change selection
      let changeAddresses = getters['getChangeAddresses']
      let changeAddr = Object.keys(changeAddresses)[0]
      transaction = transaction.fee(fee).change(changeAddr)
      signingKeys.push(changeAddresses[changeAddr].privKey)

      // Sign
      for (let i in signingKeys) {
        transaction = transaction.sign(signingKeys[i])
      }

      // Add change output
      let changeOutput = {
        address: changeAddr,
        outputIndex: 1, // This is because we have only 1 stamp output
        satoshis: inputValue - fee - totalAmount,
        txId: transaction.hash,
        type: 'p2pkh'
      }
      commit('addUTXO', changeOutput)

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
      if (state.outputs.length) {
        return state.outputs.reduce((acc, output) => acc + output.satoshis, 0)
      } else {
        return 0
      }
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
      return state.outputs
    },
    generatePrivKey: (state) => (count) => {
      return Object.values(state.addresses)[count].privKey
    }
  }
}
