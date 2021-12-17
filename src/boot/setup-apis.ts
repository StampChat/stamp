/* eslint-disable @typescript-eslint/no-explicit-any */

import { ElectrumClient } from 'electrum-cash'
import {
  electrumPingInterval,
  electrumServers,
  defaultRelayUrl,
  chronikServers,
} from '../utils/constants'
import { Wallet } from '../cashweb/wallet'
import { getRelayClient } from '../adapters/vuex-relay-adapter'
import { store as levelDbUtxoStore } from '../adapters/level-utxo-store'
import { boot } from 'quasar/wrappers'
import { Utxo, UtxoId } from 'src/cashweb/types/utxo'
import { reactive } from 'vue'
import type { App } from 'vue'
import { Store } from 'vuex'
import { RootState } from 'src/store/modules'
import { UtxoStore } from 'src/cashweb/wallet/storage/storage'
import { ChronikClient, WsEndpoint } from 'chronik-client'

function instrumentIndexerClient({
  resolve,
  reject,
  electrumClient,
  chronikWs,
  observables,
  reconnector,
}: {
  resolve: (value: ElectrumClient | PromiseLike<ElectrumClient>) => void
  reject: (reason?: any) => void
  electrumClient: ElectrumClient
  chronikWs: WsEndpoint
  observables: { connected: boolean }
  reconnector: () => void
}) {
  // We need a local variable that is unique to this client, so it doesn't fuck around
  let connectionAlive = false
  const resolved = false
  const notifyDisconnect = () => {
    // Don't reset connected state if we've already
    if (!connectionAlive) {
      return
    }
    if (!resolved) {
      reject(new Error('Unable to connect to electrum server'))
    }
    connectionAlive = false
    console.log('electrum disconnected')
    observables.connected = false
  }

  const keepAlive = () => {
    setTimeout(
      () =>
        electrumClient
          .request('server_ping')
          .then(() => {
            if (!observables.connected) {
              // We were disconnected anyways
              // Let reconnect logic find another server/reconnect
              return
            }
            keepAlive()
          })
          .catch(err => {
            console.error(
              'Error pinging electrum server. Likely disconnected',
              err,
            )
            notifyDisconnect()
          }),
      electrumPingInterval,
    )
  }

  chronikWs.onConnect = () => {
    console.log('chronik connected')
    observables.connected = true
  }

  electrumClient.connection.on('connect', () => {
    console.log('electrum connected')
    // (Re)set state on Vue prototype
    resolve(electrumClient)
    connectionAlive = true
    observables.connected = true
    keepAlive()
  })

  chronikWs.onReconnect = () => {
    console.log('chronik disconnected')
    observables.connected = false
  }

  electrumClient.connection.on('close', () => {
    notifyDisconnect()
    reconnector()
  })

  electrumClient.connection.on('end', (e?: Error) => {
    notifyDisconnect()
    console.log(e)
  })

  chronikWs.onError = err => console.error('Chronik error:', err)

  electrumClient.connection.on('error', (err?: Error) => {
    console.error('Electrum error:', err)
  })

  console.log('Attempting to connect')
  // No await here... May cause issues down the road
  electrumClient
    .connect()
    .then(() => console.log('connected'))
    .catch(err =>
      console.error('unablet to connect to electrum host', err.message),
    )
}

function createAndBindNewIndexerClient({
  app,
  observables,
  wallet,
}: {
  app: App<any>
  observables: any
  wallet: Wallet
}) {
  const { url, port, scheme } =
    electrumServers[Math.floor(Math.random() * electrumServers.length)]
  const chronikConf =
    chronikServers[Math.floor(Math.random() * chronikServers.length)]
  console.log('Using electrum server:', url, port, scheme)
  console.log('Using chronik server:', chronikConf)
  try {
    const electrumClient = new ElectrumClient(
      'Stamp Wallet',
      '1.4.1',
      url,
      port,
      scheme,
      10000,
    )
    const chronikClient = new ChronikClient(chronikConf.url)
    const chronikWs = chronikClient.ws({})

    const electrumPromise = new Promise<ElectrumClient>((resolve, reject) => {
      instrumentIndexerClient({
        resolve,
        reject,
        electrumClient,
        chronikWs,
        observables,
        reconnector: () =>
          createAndBindNewIndexerClient({ app, observables, wallet }),
      })
    })
    // (Re)set state on Vue prototype
    Object.assign(app.config.globalProperties, {
      $electrumClientPromise: electrumPromise,
    })
    console.log('setting electrum client')
    wallet.setElectrumClient(electrumPromise)
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
  const electrumObservables = reactive({ connected: false })
  createAndBindNewIndexerClient({
    app,
    observables: electrumObservables,
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
      electrumClient: app.config.globalProperties.$electrumClientPromise,
      store,
    })
  const relayToken: string = store.getters['relayClient/getToken']
  console.log('relayToken', relayToken)
  relayClient.setToken(relayToken)

  app.config.globalProperties.$wallet = wallet
  app.config.globalProperties.$electrum = electrumObservables
  app.config.globalProperties.$relayClient = relayClient
  app.config.globalProperties.$relay = relayObservables
})
