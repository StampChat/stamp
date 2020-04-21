import Vue from 'vue'

import { calcId } from '../../wallet/helpers'

const cashlib = require('bitcore-lib-cash')

export function rehydrateWallet (wallet) {
  if (!wallet || !wallet.xPrivKey) {
    return
  }
  if (!wallet.feePerByte) {
    wallet.feePerByte = 2
  }
  wallet.xPrivKey = cashlib.HDPrivateKey.fromObject(wallet.xPrivKey)
  for (const utxo of Object.values(wallet.utxos)) {
    if (utxo.type === 'p2pkh') {
      // Does not keep it's privKey with it because we like edge cases.
      continue
    }
    utxo.address = cashlib.Address.fromObject(utxo.address)
    utxo.privKey = cashlib.PrivateKey.fromObject(utxo.privKey)
  }
  for (const utxo of Object.values(wallet.frozenUTXOs)) {
    if (utxo.type === 'p2pkh') {
      // Does not keep it's privKey with it because we like edge cases.
      continue
    }
    utxo.address = cashlib.Address.fromObject(utxo.address)
    utxo.privKey = cashlib.PrivateKey.fromObject(utxo.privKey)
  }
}

export default {
  namespaced: true,
  state: {
    xPrivKey: null,
    identityPrivKey: null,
    utxos: {},
    frozenUTXOs: {},
    feePerByte: 2,
    seedPhrase: null
  },
  mutations: {
    setSeedPhrase (state, seedPhrase) {
      state.seedPhrase = seedPhrase
    },
    reset (state) {
      state.xPrivKey = null
      state.identityPrivKey = null
      state.utxos = {}
      state.frozenUTXOs = {}
    },
    setAddress (state, { address, privKey }) {
      Vue.set(state.addresses, address, { privKey })
    },
    setXPrivKey (state, xPrivKey) {
      state.xPrivKey = xPrivKey
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
    }
  },
  getters: {
    getSeedPhrase (state) {
      return state.seedPhrase
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
    }
  }
}
