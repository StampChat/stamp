/* eslint-disable indent */
import { createStore } from 'vuex'
import modules from './modules'
import type { RootState } from './modules'
import storePlugin from './level-plugin'

export default function (/* { ssrContext } */) {
  const Store = createStore<RootState>({
    modules,
    plugins: [storePlugin],

    // enable strict mode (adds overhead!)
    // for dev mode and --debug builds only
    strict: !!process.env.DEBUGGING
  })

  return Store
}
