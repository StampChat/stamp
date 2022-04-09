import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { createRoutes } from './routes'
import { useContactStore } from 'src/stores/contacts'
import { useProfileStore } from 'src/stores/my-profile'

const unprotectedRoutes = ['/', '/setup', '/forum', '/changelog']
const protectedRoutes = ['/forum/new-post']

async function addContactFromNavigation(address: string) {
  const contacsStore = useContactStore()
  try {
    contacsStore.fetchAndAddContact({ address, contact: {} })
  } catch (ex) {
    console.error('addContactFromNavigation error:', ex)
  }
}

// Note: ssrContext is also available
export default () => {
  async function redirectIfNoProfile(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) {
    const profileStore = useProfileStore()
    if (
      to.fullPath.startsWith('/chat') &&
      to.params.address &&
      typeof to.params.address === 'string'
    ) {
      addContactFromNavigation(to.params.address as string)
    }
    console.log(
      'Navigating to',
      to.fullPath,
      to.params.address,
      profileStore.profile.name,
    )
    if (
      profileStore.profile.name ||
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
