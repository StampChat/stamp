
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { KeyserverHandler } from 'src/cashweb/keyserver/handler'
import { ReadOnlyRelayClient } from 'src/cashweb/relay'
import { toAPIAddress } from 'src/utils/address'
import { keyservers, networkName, displayNetwork } from 'src/utils/constants'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { Store } from 'vuex'
import { createRoutes } from './routes'
import { RootState } from 'src/store/modules'

const unprotectedRoutes = ['/', '/agora', '/setup', '/changelog']

async function addContactFromNavigation<S> (store: Store<S>, address: string) {
  try {
    // Validate address
    const apiAddress = toAPIAddress(address) // TODO: Make generic
    // Pull information from keyserver then relay server
    const ksHandler = new KeyserverHandler({ keyservers, networkName })
    const relayURL = await ksHandler.getRelayUrl(apiAddress)
    if (!relayURL) {
      return
    }
    const relayClient = new ReadOnlyRelayClient(relayURL, networkName, displayNetwork)
    const relayData = await relayClient.getRelayData(apiAddress)
    if (!relayData) {
      return
    }
    store.dispatch('contacts/addContact', { address: apiAddress, contact: { ...relayData, relayURL } })
  } catch { }
}

// Note: ssrContext is also available
export default ({ store }: { store: Store<RootState> }) => {
  async function redirectIfNoProfile (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) {
    await ((store as unknown) as { restored: Promise<unknown> }).restored
    const profile = store.getters['myProfile/getProfile']
    if (to.fullPath.startsWith('/chat') && to.params.address && typeof to.params.address === 'string') {
      addContactFromNavigation(store, to.params.address as string)
    }
    console.log('Navigating to', to.fullPath, to.params.address, profile.name)
    if (profile.name || unprotectedRoutes.includes(to.fullPath)) {
      next()
    } else {
      console.log('nav to setup!')
      next('/setup')
    }
  }

  const routes = createRoutes()
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory

  const Router = createRouter({
    routes,
    scrollBehavior: () => ({ left: 0, top: 0 }),

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.MODE === 'ssr' ? undefined : process.env.VUE_ROUTER_BASE)
  })
  Router.beforeEach(redirectIfNoProfile)

  return Router
}
