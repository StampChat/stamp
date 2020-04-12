import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'
import { rehydateChat } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'

Vue.use(Vuex)

const parseState = (value) => {
  if (typeof value === 'string') { // If string, parse, or else, just return
    return (JSON.parse(value || '{}'))
  } else {
    return (value || {})
  }
}

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  // Hack to allow us to easily rehydrate the store
  restoreState: (key, storage) => {
    const value = (storage).getItem(key)
    const newState = parseState(value)
    rehydateChat(newState.chats)
    rehydrateWallet(newState.wallet)
    return newState
  },
  filter: (mutation) => {
    let namespace = mutation.type.split('/')[0]
    switch (namespace) {
      case 'contactDrawer':
        return false
      case 'myDrawer':
        return false
    }

    return true
  }
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
