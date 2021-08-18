
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { createRoutes } from './routes'
import { Store } from 'vuex'

// Note: ssrContext is also available
export default <S> ({ store }: { store: Store<S> }) => {
  const routes = createRoutes(store)
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

  return Router
}
