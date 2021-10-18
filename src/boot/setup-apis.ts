/* eslint-disable @typescript-eslint/no-explicit-any */

import { Outpoint, OutpointId, Wallet } from 'cashweb'
import { ElectrumClient } from 'electrum-cash'
import { boot } from 'quasar/wrappers'
import { RootState } from 'src/store/modules'
import type { App } from 'vue'
import { reactive } from 'vue'
import { Store } from 'vuex'
import { store as levelDbOutpointStore } from '../adapters/level-outpoint-store'
import { getRelayClient } from '../adapters/vuex-relay-adapter'
import {
  defaultRelayUrl,
  electrumPingInterval,
  electrumServers
} from '../utils/constants'

function instrumentElectrumClient ({
  resolve,
  reject,
  client,
  observables,
  reconnector
}: {
  resolve: (value: ElectrumClient | PromiseLike<ElectrumClient>) => void;
  reject: (reason?: any) => void;
  client: ElectrumClient;
  observables: { connected: boolean };
  reconnector: () => void;
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
        client
          .request('server_ping')
          .then(() => {
            if (!observables.connected) {
              // We were disconnected anyways
              // Let reconnect logic find another server/reconnect
              return
            }
            keepAlive()
          })
          .catch((err) => {
            console.error(
              'Error pinging electrum server. Likely disconnected',
              err
            )
            notifyDisconnect()
          }),
      electrumPingInterval
    )
  }

  client.connection.on('connect', () => {
    console.log('electrum connected')
    // (Re)set state on Vue prototype
    resolve(client)
    connectionAlive = true
    observables.connected = true
    keepAlive()
  })

  client.connection.on('close', () => {
    notifyDisconnect()
    reconnector()
  })

  client.connection.on('end', (e?: Error) => {
    notifyDisconnect()
    console.log(e)
  })

  client.connection.on('error', (err?: Error) => {
    console.error(err)
  })

  console.log('Attempting to connect')
  // No await here... May cause issues down the road
  client
    .connect()
    .then(() => console.log('connected'))
    .catch((err) =>
      console.error('unablet to connect to electrum host', err.message)
    )
}

function createAndBindNewElectrumClient ({
  app,
  observables,
  wallet
}: {
  app: App<any>;
  observables: any;
  wallet: Wallet;
}) {
  const { url, port, scheme } =
    electrumServers[Math.floor(Math.random() * electrumServers.length)]
  console.log('Using electrum server:', url, port, scheme)
  try {
    const client = new ElectrumClient(
      'Stamp Wallet',
      '1.4.1',
      url,
      port,
      scheme,
      10000
    )

    const electrumPromise = new Promise<ElectrumClient>((resolve, reject) => {
      instrumentElectrumClient({
        resolve,
        reject,
        client,
        observables,
        reconnector: () =>
          createAndBindNewElectrumClient({ app, observables, wallet })
      })
    })
    // (Re)set state on Vue prototype
    Object.assign(app.config.globalProperties, {
      $electrumClientPromise: electrumPromise
    })
    console.log('setting electrum client')
    wallet.setElectrumClient(electrumPromise)
  } catch (err: any) {
    console.log(err.message)
  }
}

async function getWalletClient ({ store }: { store: Store<any> }) {
  const outpointStore = await levelDbOutpointStore
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const storageAdapter = {
    getOutpoint (id: OutpointId) {
      return outpointStore.getOutpoint(id)
    },
    deleteOutpoint (id: OutpointId) {
      store.commit('wallet/removeUTXO', id)
      return outpointStore.deleteOutpoint(id)
    },
    putOutpoint (outpoint: Outpoint) {
      store.commit('wallet/addUTXO', Object.freeze({ ...outpoint }))
      return outpointStore.putOutpoint(outpoint)
    },
    freezeOutpoint (id: OutpointId) {
      return outpointStore.freezeOutpoint(id)
    },
    unfreezeOutpoint (id: OutpointId) {
      return outpointStore.unfreezeOutpoint(id)
    },
    getOutpoints () {
      return outpointStore.getOutpoints()
    },
    getOutpointIterator () {
      return outpointStore.getOutpointIterator()
    },
    getFrozenOutpointIterator () {
      return outpointStore.getFrozenOutpointIterator()
    },
    clear () {
      return outpointStore.clear()
    }
  }

  return new Wallet(storageAdapter)
}

export default boot<RootState>(async ({ store, app }) => {
  await (store as any).restored
  const wallet = await getWalletClient({ store })
  const electrumObservables = reactive({ connected: false })
  createAndBindNewElectrumClient({
    app,
    observables: electrumObservables,
    wallet
  })
  const xPrivKey = store.getters['wallet/getXPrivKey']
  const status = reactive({
    loaded: false,
    setup: false
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
      store
    })
  const relayToken: string = store.getters['relayClient/getToken']
  console.log('relayToken', relayToken)
  relayClient.setToken(relayToken)

  app.config.globalProperties.$wallet = wallet
  app.config.globalProperties.$electrum = electrumObservables
  app.config.globalProperties.$relayClient = relayClient
  app.config.globalProperties.$relay = relayObservables
})
