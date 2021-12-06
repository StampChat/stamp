import type { Module } from 'vuex'

import { calcId } from '../../cashweb/wallet/helpers'
import { store as levelOutpointStore } from '../../adapters/level-outpoint-store'
import { markRaw } from 'vue'
import { HDPrivateKey } from 'bitcore-lib-xpi'
import { Outpoint } from 'src/cashweb/types/outpoint'

export type State = {
  xPrivKey?: HDPrivateKey
  utxos: Record<string, number | undefined>
  seedPhrase?: string
  balance: number
  feePerByte: number
}

const defaultWalletState = {
  feePerByte: 2,
  utxos: {},
  balance: 0,
}

export type RestorableState = Omit<State, 'xPrivKey'> & { xPrivKey: unknown }

export async function rehydrateWallet(wallet: RestorableState): Promise<State> {
  if (!wallet || !wallet.xPrivKey) {
    return defaultWalletState
  }
  let balance = 0
  const utxos: Record<string, number> = {}
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const store = await levelOutpointStore
  await store.loadData()
  const outpoints = store.getOutpoints()
  for (const [id, outpoint] of outpoints) {
    if (!outpoint.address) {
      continue
    }
    utxos[id] = outpoint.satoshis
    balance += outpoint.satoshis
  }
  return {
    feePerByte: wallet.feePerByte || 2,
    balance,
    utxos,
    seedPhrase: wallet.seedPhrase,
    xPrivKey: markRaw(HDPrivateKey.fromObject(wallet.xPrivKey)),
  }
}

const module: Module<State, unknown> = {
  namespaced: true,
  state: {
    utxos: {},
    feePerByte: 2,
    balance: 0,
  },
  mutations: {
    setSeedPhrase(state, seedPhrase) {
      state.seedPhrase = seedPhrase
    },
    reset(state) {
      state.xPrivKey = undefined
      state.utxos = {}
    },
    setXPrivKey(state, xPrivKey) {
      state.xPrivKey = markRaw(xPrivKey)
    },
    removeUTXO(state, id) {
      state.balance -= state.utxos[id] ?? 0
      delete state.utxos[id]
    },
    addUTXO(state, output: Outpoint) {
      state.balance += output.satoshis
      const utxoId = calcId(output)
      state.utxos[utxoId] = output.satoshis
    },
  },
  getters: {
    getSeedPhrase(state) {
      return state.seedPhrase
    },
    getXPrivKey(state) {
      return state.xPrivKey
    },
    balance(state) {
      return state.balance
    },
  },
}

export default module
