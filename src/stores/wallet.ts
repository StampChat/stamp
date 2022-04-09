import { defineStore } from 'pinia'
import { markRaw, toRaw } from 'vue'

import { calcUtxoId } from '../cashweb/wallet/helpers'
import { store as levelOutpointStore } from '../adapters/level-utxo-store'
import { HDPrivateKey } from 'bitcore-lib-xpi'
import { Utxo } from 'src/cashweb/types/utxo'

export interface State {
  xPrivKey: HDPrivateKey | null
  utxos: Record<string, number | undefined>
  seedPhrase: string | null
  balance: number
  feePerByte: number
}

const defaultWalletState: State = {
  feePerByte: 2,
  utxos: {},
  balance: 0,
  seedPhrase: null,
  xPrivKey: null,
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
  const utxoMap = store.getUtxoMap()
  for (const [utxoId, utxo] of utxoMap) {
    if (!utxo.address) {
      continue
    }
    utxos[utxoId] = utxo.satoshis
    balance += utxo.satoshis
  }
  return {
    feePerByte: wallet.feePerByte || 2,
    balance,
    utxos,
    seedPhrase: wallet.seedPhrase,
    xPrivKey: markRaw(HDPrivateKey.fromObject(wallet.xPrivKey)),
  }
}

export const useWalletStore = defineStore('wallet', {
  state: (): State => ({
    ...defaultWalletState,
  }),
  actions: {
    reset() {
      this.xPrivKey = null
      this.utxos = {}
    },
    setXPrivKey(xPrivKey: HDPrivateKey) {
      this.xPrivKey = markRaw(xPrivKey)
    },
    setSeedPhrase(seedPhrase: string) {
      this.seedPhrase = seedPhrase
    },
    removeUTXO(id: string) {
      this.balance -= this.utxos[id] ?? 0
      delete this.utxos[id]
    },
    addUTXO(utxo: Utxo) {
      const utxoId = calcUtxoId(utxo)
      if (utxoId in this.utxos) {
        return
      }
      this.balance += utxo.satoshis
      this.utxos[utxoId] = utxo.satoshis
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      const wallet = {
        xPrivKey: state.xPrivKey ? toRaw(state.xPrivKey).toObject() : null,
        seedPhrase: state.seedPhrase,
        utxos: {},
        feePerByte: 2,
        balance: 0,
      }
      storage.put('wallet', JSON.stringify(wallet))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      let wallet = '{}'
      try {
        wallet = await storage.get('wallet')
      } catch (err) {
        //
      }
      const deserializedWallet = JSON.parse(wallet) as RestorableState
      const rehydratedChat = await rehydrateWallet(deserializedWallet)
      return rehydratedChat
    },
  },
})
