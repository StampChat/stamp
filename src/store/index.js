import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'
import { rehydateChat } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'
import { path, pathOr, mapObjIndexed } from 'ramda'
import { rehydrateContacts } from './modules/contacts'
import { displayNetwork } from '../utils/constants'

Vue.use(Vuex)

const parseState = (value) => {
  if (typeof value === 'string') { // If string, parse, or else, just return
    return (JSON.parse(value || '{}'))
  } else {
    return (value || {})
  }
}
const STORE_SCHEMA_VERSION = 4

let lastSave = -1

const storeKeys = [
  'wallet', 'relayClient', 'chats', 'storeMetadata', 'myProfile', 'contacts'
]

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  // Hack to allow us to easily rehydrate the store
  restoreState: async (key, storage) => {
    const newState = {}
    for (const partitionedKey of storeKeys) {
      const value = parseState(storage.getItem(partitionedKey))
      newState[partitionedKey] = {}
      Object.assign(newState[partitionedKey], value)
    }

    if (newState.storeMetadata && newState.storeMetadata.networkName !== displayNetwork) {
      return {
        wallet: {
          seedPhrase: path(['wallet', 'seedPhrase'], newState)
        }
      }
    }

    if (newState.storeMetadata && newState.storeMetadata.version !== STORE_SCHEMA_VERSION) {
      // Import everything else from the server again
      return {
        wallet: {
          xPrivKey: path(['wallet', 'xPrivKey'], newState),
          seedPhrase: path(['wallet', 'seedPhrase'], newState)
        },
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
        storeMetadata: {
          version: STORE_SCHEMA_VERSION,
          networkName: displayNetwork
        },
        myProfile: newState.myProfile
      }
    }
    rehydrateContacts(newState.contacts)
    await rehydateChat(newState.chats, newState.contacts)
    await rehydrateWallet(newState.wallet)
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
        activeChatAddr: pathOr(null, ['chats', 'activeChatAddr'], state),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chats: mapObjIndexed((addressData) => {
          return ({
            ...addressData,
            // Overwrite messages because storing them would be prohibitive.
            messages: {}
          })
        }, pathOr({}, ['chats', 'chats'], state))
      },
      contacts: {
        updateInterval: pathOr(600000, ['contacts', 'updateInterval'], state),
        contacts: mapObjIndexed((contactData) => {
          return ({
            ...contactData,
            profile: {
              ...contactData.profile,
              avatar: undefined
            }
          })
        }, pathOr({}, ['contacts', 'contacts'], state))
      },
      myProfile: state.myProfile,
      storeMetadata: {
        networkName: displayNetwork,
        version: STORE_SCHEMA_VERSION
      }
    }
  },
  saveState (key, state, storage) {
    for (const partitionedKey of storeKeys) {
      try {
        storage.setItem(partitionedKey, JSON.stringify(state[partitionedKey]))
      } catch (err) {
        console.log(err)
      }
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filter: (mutation) => {
    if (mutation.type.startsWith('wallet/')) {
      lastSave = Date.now()
      return true
    }

    if (mutation.type.startsWith('myProfile/')) {
      lastSave = Date.now()
      return true
    }

    if (lastSave + 6000 <= Date.now()) {
      lastSave = Date.now()
      return true
    }

    return false
  },
  asyncStorage: true
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
