
import { ElectrumClient } from 'electrum-cash'
import { electrumPingInterval, electrumServers, defaultRelayUrl } from '../utils/constants'
import { Wallet } from '../wallet'
import { getRelayClient } from '../adapters/vuex-relay-adapter'
import { store as levelDbOutpointStore } from '../adapters/level-outpoint-store'

function instrumentElectrumClient ({ resolve, reject, client, observables, reconnector }) {
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
    setTimeout(() =>
      client.request('server_ping')
        .then(
          () => {
            if (!observables.connected) {
              // We were disconnected anyways
              // Let reconnect logic find another server/reconnect
              return
            }
            keepAlive()
          }
        ).catch(err => {
          console.error('Error pinging electrum server. Likely disconnected', err)
          notifyDisconnect()
        })
    , electrumPingInterval)
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

  client.connection.on('end', (e) => {
    notifyDisconnect()
    console.log(e)
  })

  client.connection.on('error', (err) => {
    console.error(err)
  })

  // No await here... May cause issues down the road
  client.connect()
}

function createAndBindNewElectrumClient ({ Vue, observables, wallet }) {
  const { url, port, scheme } = electrumServers[Math.floor(Math.random() * electrumServers.length)]
  console.log('Using electrum server:', url, port)
  try {
    const client = new ElectrumClient('Stamp Wallet', '1.4.1', url, port, scheme)

    const electrumPromise = new Promise((resolve, reject) => {
      instrumentElectrumClient({
        resolve,
        reject,
        client,
        observables,
        reconnector: () => createAndBindNewElectrumClient({ Vue, observables, wallet })
      })
    })
    // (Re)set state on Vue prototype
    Vue.prototype.$electrumClientPromise = electrumPromise
    console.log('setting electrum client')
    wallet.setElectrumClient(electrumPromise)
  } catch (err) {
    console.log(err.message)
  }
}

async function getWalletClient ({ store }) {
  const outpointStore = await levelDbOutpointStore
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const storageAdapter = {
    getOutpoint (id) {
      return outpointStore.getOutpoint(id)
    },
    deleteOutpoint (id) {
      store.commit('wallet/removeUTXO', id)
      return outpointStore.deleteOutpoint(id)
    },
    putOutpoint (outpoint) {
      store.commit('wallet/addUTXO', outpoint)
      return outpointStore.putOutpoint(outpoint)
    },
    freezeOutpoint (id) {
      return outpointStore.freezeOutpoint(id)
    },
    unfreezeOutpoint (id) {
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
    }
  }

  return new Wallet(storageAdapter)
}

export default async ({ store, Vue }) => {
  await store.restored
  // TODO: WE should probably rename this file to something more specific
  // as its instantiating the wallet now also.
  const wallet = await getWalletClient({ store })
  const electrumObservables = Vue.observable({ connected: false })
  createAndBindNewElectrumClient({ Vue, observables: electrumObservables, wallet })
  const xPrivKey = store.getters['wallet/getXPrivKey']
  console.log('xpriv', xPrivKey)

  // Check if setup was finished.
  // TODO: There should be a better way to do this.
  const profile = store.getters['myProfile/getProfile']
  if (xPrivKey && profile.name) {
    console.log('Loaded previous private key')
    wallet.setXPrivKey(xPrivKey)
  }
  const { client: relayClient, observables: relayObservables } = await getRelayClient({ relayUrl: defaultRelayUrl, wallet, electrumObservables, store })
  const relayToken = store.getters['relayClient/getToken']
  relayClient.setToken(relayToken)

  Vue.prototype.$wallet = wallet
  Vue.prototype.$electrum = electrumObservables
  Vue.prototype.$relayClient = relayClient
  Vue.prototype.$relay = Vue.observable(relayObservables)
}
