/* eslint-disable @typescript-eslint/no-explicit-any */

import { defaultRelayUrl, chronikServers } from '../utils/constants'
import { Wallet } from '../cashweb/wallet'
import { getRelayClient } from '../adapters/vuex-relay-adapter'
import { store as levelDbUtxoStore } from '../adapters/level-utxo-store'
import { boot } from 'quasar/wrappers'
import { Utxo, UtxoId } from 'src/cashweb/types/utxo'
import { reactive } from 'vue'
import { Store } from 'vuex'
import { RootState } from 'src/store/modules'
import { UtxoStore } from 'src/cashweb/wallet/storage/storage'
import { ChronikClient, WsEndpoint } from 'chronik-client'

function instrumentIndexerClient({
  chronikWs,
  observables,
}: {
  chronikWs: WsEndpoint
  observables: { connected: boolean }
}) {
  chronikWs.onConnect = () => {
    console.log('chronik connected')
    observables.connected = true
  }

  chronikWs.onReconnect = () => {
    console.log('chronik disconnected')
    observables.connected = false
  }

  chronikWs.onError = err => console.error('Chronik error:', err)
}

function createAndBindNewIndexerClient({
  observables,
  wallet,
}: {
  observables: any
  wallet: Wallet
}) {
  const chronikConf =
    chronikServers[Math.floor(Math.random() * chronikServers.length)]
  console.log('Using chronik server:', chronikConf)
  try {
    const chronikClient = new ChronikClient(chronikConf.url)
    const chronikWs = chronikClient.ws({})

    instrumentIndexerClient({
      chronikWs,
      observables,
    })
    console.log('setting chronik client')
    wallet.setChronik({ chronikClient, chronikWs })
    wallet.init()
  } catch (err: any) {
    console.log(err.message)
  }
}

async function getWalletClient({ store }: { store: Store<any> }) {
  const utxoStore = await levelDbUtxoStore
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const storageAdapter: UtxoStore = {
    getById(id: UtxoId) {
      return utxoStore.getById(id)
    },
    deleteById(id: UtxoId) {
      store.commit('wallet/removeUTXO', id)
      return utxoStore.deleteById(id)
    },
    put(outpoint: Utxo) {
      store.commit('wallet/addUTXO', Object.freeze({ ...outpoint }))
      return utxoStore.put(outpoint)
    },
    freezeById(id: UtxoId) {
      return utxoStore.freezeById(id)
    },
    unfreezeById(id: UtxoId) {
      return utxoStore.unfreezeById(id)
    },
    getUtxoMap() {
      return utxoStore.getUtxoMap()
    },
    utxosIter() {
      return utxoStore.utxosIter()
    },
    frozenUtxosIter() {
      return utxoStore.frozenUtxosIter()
    },
    clear() {
      return utxoStore.clear()
    },
  }

  return new Wallet(storageAdapter)
}

export default boot<RootState>(async ({ store, app }) => {
  await (store as any).restored
  const wallet = await getWalletClient({ store })
  const indexerObservables = reactive({ connected: false })
  createAndBindNewIndexerClient({
    observables: indexerObservables,
    wallet,
  })
  const xPrivKey = store.getters['wallet/getXPrivKey']
  const status = reactive({
    loaded: false,
    setup: false,
  })
  app.config.globalProperties.$status = status
  console.log('xPrivKey', xPrivKey)
  // Check if setup was finished.
  // TODO: There should be a better way to do this.
  const profile = store.getters['myProfile/getProfile']
  console.log('profile.name', profile.name)
  status.setup = xPrivKey && profile.name
  if (xPrivKey && profile.name) {
    console.log('Loaded previous private key')
    wallet.setXPrivKey(xPrivKey)
    status.setup = true
  }
  const { client: relayClient, observables: relayObservables } =
    await getRelayClient({
      relayUrl: defaultRelayUrl,
      wallet,
      store,
    })
  const relayToken: string = store.getters['relayClient/getToken']
  console.log('relayToken', relayToken)
  relayClient.setToken(relayToken)

  app.config.globalProperties.$wallet = wallet
  app.config.globalProperties.$indexer = indexerObservables
  app.config.globalProperties.$relayClient = relayClient
  app.config.globalProperties.$relay = relayObservables
})
