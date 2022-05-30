/* eslint-disable @typescript-eslint/no-explicit-any */

import { defaultRelayUrl, chronikServers } from '../utils/constants'
import { Wallet } from '../cashweb/wallet'
import { getRelayClient } from '../adapters/pinia-relay-adapter'
import { store as levelDbUtxoStore } from '../adapters/level-utxo-store'
import { boot } from 'quasar/wrappers'
import { Utxo, UtxoId } from 'src/cashweb/types/utxo'
import { reactive } from 'vue'
import { UtxoStore } from 'src/cashweb/wallet/storage/storage'
import { ChronikClient, WsEndpoint } from 'chronik-client'
import { useWalletStore } from 'src/stores/wallet'
import { useProfileStore } from 'src/stores/my-profile'
import { useRelayClientStore } from 'src/stores/relay-client'
import { useContactStore } from 'src/stores/contacts'
import { useAppearanceStore } from 'src/stores/appearance'
import { useForumStore } from 'src/stores/forum'

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

async function getWalletClient() {
  const utxoStore = await levelDbUtxoStore
  const wallet = useWalletStore()
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const storageAdapter: UtxoStore = {
    getById(id: UtxoId) {
      return utxoStore.getById(id)
    },
    deleteById(id: UtxoId) {
      wallet.removeUTXO(id)
      return utxoStore.deleteById(id)
    },
    put(outpoint: Utxo) {
      wallet.addUTXO(Object.freeze({ ...outpoint }))
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

export default boot(async ({ app }) => {
  const wallet = await getWalletClient()
  const indexerObservables = reactive({ connected: false })
  createAndBindNewIndexerClient({
    observables: indexerObservables,
    wallet,
  })
  const walletStore = useWalletStore()
  await walletStore.restored
  const profileStore = useProfileStore()
  await profileStore.restored

  const xPrivKey = walletStore.xPrivKey
  const status = reactive({
    loaded: false,
    setup: false,
  })
  app.config.globalProperties.$status = status
  console.log('xPrivKey', xPrivKey)
  // Check if setup was finished.
  // TODO: There should be a better way to do this.
  const profile = profileStore.profile
  console.log('profile.name', profile.name)
  status.setup = !!xPrivKey && !!profile.name
  if (xPrivKey && profile.name) {
    console.log('Loaded previous private key')
    wallet.setXPrivKey(xPrivKey)
    status.setup = true
  }
  const { client: relayClient, observables: relayObservables } =
    await getRelayClient({
      relayUrl: defaultRelayUrl,
      wallet,
    })

  const relayStore = useRelayClientStore()
  await relayStore.restored
  const token = relayStore.token
  console.log('relayToken', token)
  if (token) {
    relayClient.setToken(token)
  }

  const contactStore = useContactStore()
  await contactStore.restored

  const appearanceStore = useAppearanceStore()
  await appearanceStore.restored

  const forumStore = useForumStore()
  await forumStore.restored

  app.config.globalProperties.$wallet = wallet
  app.config.globalProperties.$indexer = indexerObservables
  app.config.globalProperties.$relayClient = relayClient
  app.config.globalProperties.$relay = relayObservables
  app.config.globalProperties.$status = status
})
