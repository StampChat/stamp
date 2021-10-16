import type { Module } from 'vuex'

import { calcId } from '../cashweb'
import { store as levelOutpointStore } from '../../adapters/level-outpoint-store'
import { markRaw } from 'vue'
import { HDPrivateKey } from 'bitcore-lib-xpi'
import { Outpoint } from 'app/local_modules/cashweb/lib/types/outpoint'

type State = {
  xPrivKey?: HDPrivateKey,
  utxos: Record<string, number | undefined>,
  seedPhrase?: string,
  balance: number,
  feePerByte: 2
}

export async function rehydrateWallet (wallet: State) {
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

type RootState = any;

const module: Module<State, RootState> = {
  namespaced: true,
  state: {
    utxos: {},
    feePerByte: 2,
    balance: 0
  },
  mutations: {
    setSeedPhrase (state, seedPhrase) {
      state.seedPhrase = seedPhrase
    },
    reset (state) {
      state.xPrivKey = undefined
      state.utxos = {}
    },
    setXPrivKey (state, xPrivKey) {
      state.xPrivKey = markRaw(xPrivKey)
    },
    removeUTXO (state, id) {
      state.balance -= state.utxos[id] ?? 0
      delete state.utxos[id]
    },
    addUTXO (state, output: Outpoint) {
      state.balance += output.satoshis
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

export default module
