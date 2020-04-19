
import { Client as ElectrumClient } from 'electrum-cash'
import { electrumPingInterval, electrumURL, electrumPort } from '../utils/constants'

async function getElectrumClient ({ port, host }) {
  const client = new ElectrumClient('Stamp Wallet', '1.4.1', host, port)

  // This must be an object because otherwise the fields will not be
  // re-wrapped as Vue observables.
  const observables = {
    connected: false
  }

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

  return { client, observables }
}

export default async ({ app, store, Vue }) => {
  const { client, observables } = await getElectrumClient({ host: electrumURL, port: electrumPort })
  Vue.prototype.$electrumClient = client
  Vue.prototype.$electrum = Vue.observable(observables)
  store.commit('wallet/setElectrumClient', client, { root: true })
}
