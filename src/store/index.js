import { createStore } from 'vuex'
import modules from './modules'
import { rehydateChat } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'
import { path, pathOr, mapObjIndexed } from 'ramda'
import { rehydrateContacts } from './modules/contacts'
import { displayNetwork } from '../utils/constants'
import { store as outpointStore } from '../adapters/level-outpoint-store'
import { store as messageStore } from '../adapters/level-message-store'

import level from 'level'

const parseState = (value) => {
  if (typeof value === 'string') { // If string, parse, or else, just return
    return (JSON.parse(value || '{}'))
  } else {
    return (value || {})
  }
}

const STORE_SCHEMA_VERSION = 1

const storeKeys = [
  'wallet', 'relayClient', 'chats', 'storeMetadata', 'myProfile', 'contacts', 'appearance'
]

const storePlugin = (store) => {
  const storage = level('vuex-store')
  let lastSave = -1

  const reduceState = (state, defaults = false) => {
    return {
      wallet: {
        xPrivKey: path(['wallet', 'xPrivKey'], state),
        seedPhrase: path(['wallet', 'seedPhrase'], state),
        utxos: {},
        feePerByte: 2,
        balance: 0
      },
      relayClient: {
        token: defaults
          ? null
          : path(['relayClient', 'token'], state)
      },
      chats: {
        activeChatAddr: pathOr(null, ['chats', 'activeChatAddr'], state),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chats: defaults
          ? {}
          : mapObjIndexed((addressData) => {
            return ({
              ...addressData,
              // Overwrite messages because storing them would be prohibitive.
              messages: {}
            })
          }, pathOr({}, ['chats', 'chats'], state))
      },
      contacts: {
        updateInterval: pathOr(600000, ['contacts', 'updateInterval'], state),
        contacts: defaults
          ? {}
          : mapObjIndexed((contactData) => {
            return ({
              ...contactData,
              profile: {
                ...contactData.profile,
                avatar: undefined
              }
            })
          }, pathOr({}, ['contacts', 'contacts'], state))
      },
      myProfile: state.myProfile || {
        profile: { name: null, bio: null, avatar: null }, inbox: { acceptancePrice: null }
      },
      appearance: state.appearance || {
        darkMode: false
      },
      storeMetadata: {
        networkName: state.storeMetata ? state.storeMetata.version : displayNetwork,
        version: state.storeMetata ? state.storeMetata.version : 0
      }
    }
  }

  const restoreState = async () => {
    const newState = reduceState(store.state)
    for (const partitionedKey of storeKeys) {
      try {
        const gottenValue = await storage.get(partitionedKey)
        const value = await parseState(gottenValue)
        newState[partitionedKey] = value
      } catch (err) {
        console.log(err)
      }
    }

    const invalidStore = newState.storeMetadata &&
      (newState.storeMetadata.networkName !== displayNetwork || newState.storeMetadata.version !== STORE_SCHEMA_VERSION)
    console.log(newState.storeMetadata, invalidStore, newState.storeMetadata.networkName, newState.storeMetadata.version !== STORE_SCHEMA_VERSION)

    if (invalidStore) {
      console.warn('Clearing local storage due to network or store schema change')
      store.replaceState(reduceState(newState, true))
      // Wipe indexDB
      storage.clear()
      const messageDb = await messageStore
      messageDb.clear()
      const outpointDb = await outpointStore
      outpointDb.clear()
    }

    rehydrateContacts(newState.contacts)
    await rehydateChat(newState.chats, newState.contacts)
    await rehydrateWallet(newState.wallet)
    console.log('Restoring state')
    store.replaceState(newState)
  }

  const filterState = (mutation) => {
    if (mutation.type.startsWith('wallet/') && !['wallet/addUTXO', 'wallet/removeUTXO'].includes(mutation.type)) {
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
  }

  const saveState = (mutation, state) => {
    if (!filterState(mutation, state)) {
      return
    }
    console.log('Saving vuex state')
    const newState = reduceState(state)
    for (const partitionedKey of storeKeys) {
      storage.put(partitionedKey, JSON.stringify(newState[partitionedKey])).catch(err => {
        console.error('Unable to set state for key', partitionedKey)
        console.log(err)
      })
    }
  }

  store.restored = Promise.resolve(new Promise((resolve, reject) => {
    restoreState()
      .catch((err) => reject(err))
      .then(() => {
        console.log('vuex state restored')
        store.subscribe(saveState)
        resolve(true)
      })
  }))
}

export default function (/* { ssrContext } */) {
  const Store = createStore({
    modules,
    plugins: [storePlugin],

    // enable strict mode (adds overhead!)
    // for dev mode and --debug builds only
    strict: process.env.DEBUGGING
  })

  return Store
}
