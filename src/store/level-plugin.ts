import level from 'level'
import { Store } from 'vuex'
import type { MutationPayload } from 'vuex'

import { rehydateChat, defaultChatsState } from './modules/chats'
import { rehydrateWallet } from './modules/wallet'
import { path, pathOr, mapObjIndexed } from 'ramda'
import { rehydrateContacts, defaultContactsState } from './modules/contacts'
import { displayNetwork } from '../utils/constants'
import { store as utxoStore } from '../adapters/level-utxo-store'
import { store as messageStore } from '../adapters/level-message-store'
import type { RootState } from './modules'

function parseState<T>(value: string): T {
  if (typeof value === 'string') {
    // If string, parse, or else, just return
    return JSON.parse(value || '{}')
  } else {
    return value || {}
  }
}

const STORE_SCHEMA_VERSION = 4

const storeKeys = [
  'wallet',
  'relayClient',
  'chats',
  'storeMetadata',
  'myProfile',
  'contacts',
  'appearance',
]

type SavableState = {
  wallet: {
    xPrivKey: unknown
    seedPhrase: string
    utxos: Record<string, number>
    feePerByte: number
    balance: number
  }
  relayClient: { token?: string }
  appearance: RootState['appearance']
  contacts: RootState['contacts']
  chats: RootState['chats']
  myProfile: {
    profile: { name?: string; bio?: string; avatar?: string }
    inbox: { acceptancePrice?: number }
  }
  restored: Promise<boolean>
  storeMetadata?: {
    networkName: string
    version: number
  }
}

const storePlugin = (store: Store<RootState>) => {
  const storage = level('vuex-store')
  let lastSave = -1

  const reduceState = (state: RootState): SavableState => {
    const reducedContacts = mapObjIndexed(
      (contactData: Record<string, unknown>) => {
        return {
          ...contactData,
          profile: {
            ...pathOr({}, ['profile'], contactData),
            avatar: undefined,
          },
        }
      },
      pathOr({}, ['contacts', 'contacts'], state),
    )

    const reducedContactState = {
      updateInterval: pathOr(600000, ['contacts', 'updateInterval'], state),
      contacts: reducedContacts,
    }

    const contacts = reducedContactState

    const chats = {
      activeChatAddr: pathOr(undefined, ['chats', 'activeChatAddr'], state),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      chats: mapObjIndexed((addressData: Record<string, unknown>) => {
        return {
          ...addressData,
          // Overwrite messages because storing them would be prohibitive.
          messages: [],
        }
      }, pathOr({}, ['chats', 'chats'], state)),
      messages: {},
      lastReceived: state.chats?.lastReceived ?? 0,
    }

    const wallet = {
      xPrivKey: path(['wallet', 'xPrivKey'], state) as number[],
      seedPhrase: path(['wallet', 'seedPhrase'], state) as string,
      utxos: {},
      feePerByte: 2,
      balance: 0,
    }

    return {
      wallet,
      relayClient: {
        token: path(['relayClient', 'token'], state),
      },
      chats,
      contacts,
      myProfile: state.myProfile ?? { profile: {}, inbox: {} },
      appearance: state.appearance || {
        darkMode: false,
      },
      storeMetadata: {
        networkName: pathOr(
          displayNetwork,
          ['storeMetadata', 'networkName'],
          state,
        ),
        version: pathOr(
          STORE_SCHEMA_VERSION,
          ['storeMetadata', 'version'],
          state,
        ),
      },
      restored: Promise.resolve(true),
    }
  }

  const resetState = (state: SavableState): SavableState => {
    const contacts = defaultContactsState
    const chats = defaultChatsState
    const wallet = {
      xPrivKey: path(['wallet', 'xPrivKey'], state) as number[],
      seedPhrase: path(['wallet', 'seedPhrase'], state) as string,
      utxos: {},
      feePerByte: 2,
      balance: 0,
    }

    return {
      wallet,
      relayClient: {
        token: path(['relayClient', 'token'], state),
      },
      chats,
      contacts,
      myProfile: state.myProfile ?? { profile: {}, inbox: {} },
      appearance: state.appearance || {
        darkMode: false,
      },
      storeMetadata: {
        networkName: displayNetwork,
        version: STORE_SCHEMA_VERSION,
      },
      restored: Promise.resolve(true),
    }
  }

  const restoreState = async () => {
    let newState = reduceState(store.state)
    for (const partitionedKey of storeKeys) {
      try {
        const gottenValue = await storage.get(partitionedKey)
        const value = await parseState(gottenValue)
        const writableState = newState as Record<string, unknown>
        writableState[partitionedKey] = value
      } catch (err) {
        console.log(err)
      }
    }

    const invalidStore =
      pathOr(displayNetwork, ['networkName'], newState.storeMetadata) !==
        displayNetwork ||
      pathOr(STORE_SCHEMA_VERSION, ['version'], newState.storeMetadata) !==
        STORE_SCHEMA_VERSION

    if (invalidStore) {
      console.warn(
        'Clearing local storage due to network or store schema change',
      )
      newState = resetState(newState)
      // Wipe indexDB
      await storage.clear()
      const messageDb = await messageStore
      await messageDb.clear()
      const utxoDb = await utxoStore
      await utxoDb.clear()
    }

    const replaceableState: RootState = {
      ...newState,
      contacts: rehydrateContacts(newState.contacts),
      chats: await rehydateChat(newState.chats),
      wallet: await rehydrateWallet(newState.wallet),
      forum: store.state.forum,
    }
    console.log('Restoring state')
    store.replaceState(replaceableState)
  }

  const filterState = (mutation: MutationPayload) => {
    if (
      mutation.type.startsWith('wallet/') &&
      !['wallet/addUTXO', 'wallet/removeUTXO'].includes(mutation.type)
    ) {
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

  const saveState = (mutation: MutationPayload, state: RootState) => {
    if (!filterState(mutation)) {
      return
    }
    console.log('Saving vuex state')
    const newState = reduceState(state)
    const indexableState = newState as Record<string, unknown>
    for (const partitionedKey of storeKeys) {
      storage
        .put(partitionedKey, JSON.stringify(indexableState[partitionedKey]))
        .catch(err => {
          console.error('Unable to set state for key', partitionedKey)
          console.log(err)
        })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(store as any).restored = Promise.resolve(
    new Promise((resolve, reject) => {
      restoreState()
        .catch(err => reject(err))
        .then(() => {
          console.log('vuex state restored')
          store.subscribe(saveState)
          resolve(true)
        })
    }),
  )
}

export default storePlugin
