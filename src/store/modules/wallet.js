import { calcId } from '../../cashweb/wallet/helpers'
import { store as levelOutpointStore } from '../../adapters/level-outpoint-store'
import { markRaw } from 'vue'
import { HDPrivateKey } from 'bitcore-lib-xpi'

export async function rehydrateWallet (wallet) {
  if (!wallet || !wallet.xPrivKey) {
    return
  }
  if (!wallet.feePerByte) {
    wallet.feePerByte = 2
  }
  Object.defineProperty(wallet, 'xPrivKey', {
    value: markRaw(HDPrivateKey.fromObject(wallet.xPrivKey)),
    writable: true,
    configurable: false
  })
  wallet.utxos = {}
  wallet.balance = 0
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const store = await levelOutpointStore
  await store.loadData()
  const outpoints = store.getOutpoints()
  for (const [id, outpoint] of outpoints) {
    if (!outpoint.address) {
      continue
    }
    wallet.utxos[id] = outpoint.satoshis
    wallet.balance += outpoint.satoshis
  }
}

export default {
  namespaced: true,
  state: {
    xPrivKey: null,
    utxos: {},
    feePerByte: 2,
    seedPhrase: null,
    balance: 0
  },
  mutations: {
    setSeedPhrase (state, seedPhrase) {
      state.seedPhrase = seedPhrase
    },
    reset (state) {
      state.xPrivKey = null
      state.utxos = {}
    },
    setXPrivKey (state, xPrivKey) {
      state.xPrivKey = markRaw(xPrivKey)
    },
    removeUTXO (state, id) {
      state.balance -= state.utxos[id] || 0
      delete state.utxos[id]
    },
    addUTXO (state, output) {
      state.balance += output.satoshis || 0
      const utxoId = calcId(output)
      state.utxos[utxoId] = output.satoshis
    }
  },
  getters: {
    getSeedPhrase (state) {
      return state.seedPhrase
    },
    getXPrivKey (state) {
      return state.xPrivKey
    },
    balance (state) {
      return state.balance
    }
  }
}
