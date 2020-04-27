import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'
import { rehydateChat } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'
import { path, pathOr, map } from 'ramda'

Vue.use(Vuex)

const parseState = (value) => {
  if (typeof value === 'string') { // If string, parse, or else, just return
    return (JSON.parse(value || '{}'))
  } else {
    return (value || {})
  }
}
const STORE_SCHEMA_VERSION = 2

let lastSave = Date.now()

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  // Hack to allow us to easily rehydrate the store
  restoreState: (key, storage) => {
    const value = storage.getItem(key)
    let newState = parseState(value)
    console.log('Restoring state', newState)
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
        chats: {
          data: map(addressData => {
            return {
              messages: {},
              stampAmount: path(['stampAmount'], addressData),
              lastRead: path(['lastRead'], addressData)
            }
          }, pathOr({}, ['chats', 'data'], newState))
        },
        version: STORE_SCHEMA_VERSION,
        myProfile: newState.myProfile
      }
    }
    console.log('new new state', newState)
    rehydateChat(newState.chats)
    rehydrateWallet(newState.wallet)
    return newState
  },
  reducer (state) {
    return {
      wallet: {
        xPrivKey: path(['wallet', 'xPrivKey'], state),
        seedPhrase: path(['wallet', 'seedPhrase'], state)
      },
      relayClient: {
        token: path(['relayClient', 'token'], state)
      },
      chats: {
        data: map(addressData => {
          return ({
            lastRead: addressData.lastRead,
            // TODO: We need to save this remotely somewhere.
            stampAmount: path(['stampAmount'], addressData),
            messages: {}
          })
        },
        pathOr({}, ['chats', 'data'], state))
      },
      myProfile: state.myProfile,
      version: STORE_SCHEMA_VERSION
    }
  },
  saveState (key, state, storage) {
    console.log('saving state', state.chats)
    storage.setItem(key, JSON.stringify(state))
  },
  filter: (mutation) => {
    if (lastSave + 10000 >= Date.now()) {
      return false
    }
    lastSave = Date.now()

    return true
  }
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
