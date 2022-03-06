import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { Store } from 'vuex'
import { createRoutes } from './routes'
import { RootState } from 'src/store/modules'

const unprotectedRoutes = ['/', '/setup', '/forum', '/changelog']
const protectedRoutes = ['/forum/new-post']

async function addContactFromNavigation<S>(store: Store<S>, address: string) {
  try {
    store.dispatch('contacts/addContact', { address })
  } catch (ex) {
    console.error('addContactFromNavigation error:', ex)
  }
}

// Note: ssrContext is also available
export default ({ store }: { store: Store<RootState> }) => {
  async function redirectIfNoProfile(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) {
    await (store as unknown as { restored: Promise<unknown> }).restored
    const profile = store.getters['myProfile/getProfile']
    if (
      to.fullPath.startsWith('/chat') &&
      to.params.address &&
      typeof to.params.address === 'string'
    ) {
      addContactFromNavigation(store, to.params.address as string)
    }
    console.log('Navigating to', to.fullPath, to.params.address, profile.name)
    if (
      profile.name ||
      (unprotectedRoutes.some(path => to.fullPath.startsWith(path)) &&
        !protectedRoutes.some(path => to.fullPath.startsWith(path)))
    ) {
      next()
    } else {
      console.log('nav to setup!')
      next('/setup')
    }
  }

  const routes = createRoutes()
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory

  const Router = createRouter({
    routes,
    scrollBehavior: () => ({ left: 0, top: 0 }),

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(
      process.env.MODE === 'ssr' ? undefined : process.env.VUE_ROUTER_BASE,
    ),
  })
  Router.beforeEach(redirectIfNoProfile)

  return Router
}
