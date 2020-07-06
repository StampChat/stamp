import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'
import { rehydateChat } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'
import { path, pathOr, mapObjIndexed } from 'ramda'
import { rehydrateContacts } from './modules/contacts'

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
  restoreState: async (key, storage) => {
    const value = storage.getItem(key)
    let newState = parseState(value)
    console.log('Restoring state', newState)
    if (newState.version !== STORE_SCHEMA_VERSION) {
      // Import everything else from the server again
      newState = {
        wallet: newState.wallet,
        relayClient: {
          token: path(['relayClient', 'token'], newState)
        },
        chats: {
          chats: mapObjIndexed((addressData, address) => {
            console.log(`Loading lastRead time ${addressData.lastRead} for address ${address}`)
            return {
              messages: [],
              stampAmount: path(['stampAmount'], addressData),
              lastRead: path(['lastRead'], addressData)
            }
          }, pathOr({}, ['chats', 'chats'], newState))
        },
        version: STORE_SCHEMA_VERSION,
        myProfile: newState.myProfile
      }
    }
    console.log('new new state', newState)
    rehydrateContacts(newState.contacts)
    await rehydateChat(newState.chats, newState.contacts)
    rehydrateWallet(newState.wallet)
    return newState
  },
  reducer (state) {
    console.log('reducing state', state)
    return {
      wallet: state.wallet,
      relayClient: {
        token: path(['relayClient', 'token'], state)
      },
      chats: {
        activeChatAddr: pathOr(null, ['chats', 'activeChatAddr'], state),
        chats: mapObjIndexed((addressData, address) => {
          console.log(`Saving lastRead time ${addressData.lastRead} for address ${address}`)
          return ({
            ...addressData,
            // Overwrite messages because storing them would be prohibitive.
            messages: {}
          })
        },
        pathOr({}, ['chats', 'chats'], state))
      },
      contacts: state.contacts,
      myProfile: state.myProfile,
      version: STORE_SCHEMA_VERSION
    }
  },
  saveState (key, state, storage) {
    console.log('saving state', state)
    storage.setItem(key, JSON.stringify(state))
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filter: (mutation) => {
    if (lastSave + 1000 >= Date.now()) {
      return false
    }
    lastSave = Date.now()

    return true
  },
  asyncStorage: true
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
