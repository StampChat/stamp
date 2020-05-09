
import { Client as ElectrumClient } from 'electrum-cash'
import { electrumPingInterval, electrumServers, defaultRelayUrl } from '../utils/constants'
import { Wallet } from '../wallet'
import { getRelayClient } from '../utils/relay-client-factory'

async function createAndBindNewElectrumClient ({ Vue, observables, wallet }) {
  const { electrumURL, electrumPort } = electrumServers[Math.floor(Math.random() * electrumServers.length)]
  console.log('Using electrum server:', electrumURL, electrumPort)
  const client = new ElectrumClient('Stamp Wallet', '1.4.1', electrumURL, electrumPort)
  await instrumentElectrumClient({
    client,
    observables,
    reconnector: () => createAndBindNewElectrumClient({ Vue, observables, wallet })
  })
  // (Re)set state on Vue prototype
  Vue.prototype.$electrumClient = client
  wallet.setElectrumClient(client)
}

async function instrumentElectrumClient ({ client, observables, reconnector }) {
  const checkConnection = async () => {
    try {
      await client.request('server_ping')
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  const keepAlive = async () => {
    setTimeout(async () => {
      if (!keepAlive) {
        await client.connect()
      }
      observables.connected = await checkConnection()
      keepAlive()
    }, electrumPingInterval)
  }

  client.connection.socket.on('connect', () => {
    console.log('electrum connected')
    observables.connected = true
    keepAlive()
  })

  client.connection.socket.on('close', () => {
    console.log('electrum disconnected')
    observables.connected = false
    reconnector()
  })

  client.connection.socket.on('end', (e) => {
    observables.connected = false
    console.log(e)
  })

  client.connection.socket.on('error', (err) => {
    console.error(err)
  })

  try {
    await client.connect()
  } catch (err) {
    console.error(err)
  }
}

function getWalletClient ({ store }) {
  const storageAdapter = {
    getFrozenUTXOs () {
      return store.getters['wallet/getFrozenUTXOs']
    },
    freezeUTXO (id) {
      store.commit('wallet/freezeUTXO', id)
    },
    unfreezeUTXO (id) {
      store.commit('wallet/unfreezeUTXO', id)
    },
    removeFrozenUTXO (id) {
      store.commit('wallet/removeFrozenUTXO', id)
    },
    getUTXOs () {
      return store.getters['wallet/getUTXOs']
    },
    removeUTXO (id) {
      store.commit('wallet/removeUTXO', id)
    },
    addUTXO (output) {
      store.commit('wallet/addUTXO', output)
    }
  }

  return new Wallet(storageAdapter)
}

export default async ({ store, Vue }) => {
  // TODO: WE should probably rename this file to something more specific
  // as its instantiating the wallet now also.
  const wallet = getWalletClient({ store })
  const electrumObservables = Vue.observable({ connected: false })
  await createAndBindNewElectrumClient({ Vue, observables: electrumObservables, wallet })
  const xPrivKey = store.getters['wallet/getXPrivKey']
  console.log('xpriv', xPrivKey)
  if (xPrivKey) {
    console.log('Loaded previous private key')
    wallet.setXPrivKey(xPrivKey)
    await wallet.init()
  }
  const { client: relayClient, observables: relayObservables } = getRelayClient({ relayUrl: defaultRelayUrl, wallet, electrumObservables, store })
  const relayToken = store.getters['relayClient/getToken']
  relayClient.setToken(relayToken)

  Vue.prototype.$wallet = wallet
  Vue.prototype.$electrum = electrumObservables
  Vue.prototype.$relayClient = relayClient
  Vue.prototype.$relay = Vue.observable(relayObservables)
}
