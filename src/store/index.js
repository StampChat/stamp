import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'
import { rehydateChat } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'
import { path } from 'ramda'

Vue.use(Vuex)

const parseState = (value) => {
  if (typeof value === 'string') { // If string, parse, or else, just return
    return (JSON.parse(value || '{}'))
  } else {
    return (value || {})
  }
}
const STORE_SCHEMA_VERSION = 1

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  // Hack to allow us to easily rehydrate the store
  restoreState: (key, storage) => {
    const value = storage.getItem(key)
    let newState = parseState(value)
    if (newState.version !== STORE_SCHEMA_VERSION) {
      // Import everything else from the server again
      newState = {
        wallet: {
          xPrivKey: path(['wallet', 'xPrivKey'], newState),
          seedPhrase: path(['wallet', 'seedPhrase'], newState)
        },
        relayClient: {
          token: path(['relayClient', 'token'], newState)
        },
        version: STORE_SCHEMA_VERSION,
        myProfile: newState.myProfile
      }
    }
    rehydateChat(newState.chats)
    rehydrateWallet(newState.wallet)
    return newState
  },
  reducer (state) {
    console.log('reducing state')
    return {
      wallet: {
        xPrivKey: path(['wallet', 'xPrivKey'], state),
        seedPhrase: path(['wallet', 'seedPhrase'], state)
      },
      relayClient: {
        token: path(['relayClient', 'token'], state)
      },
      myProfile: state.myProfile,
      version: STORE_SCHEMA_VERSION
    }
  },
  saveState (key, state, storage) {
    console.log('saving state')
    storage.setItem(key, JSON.stringify(state))
  },
  filter: (mutation) => {
    switch (mutation) {
      case 'relayClient/setToken':
        return true
      case 'wallet/setXPrivKey':
        return true
      case 'wallet/setSeedPhrase':
        return true
    }

    return false
  }
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
