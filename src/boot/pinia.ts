import { boot } from 'quasar/wrappers'
import { createPinia } from 'pinia'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { StateTree, SubscriptionCallbackMutation } from 'pinia'
import level, { LevelDB } from 'level'
import { displayNetwork } from '../utils/constants'
import { pathOr } from 'ramda'

export type StoreMetadata = {
  networkName: string
  version: number
}

export interface StorageOptions<S extends StateTree> {
  save: (
    storage: LevelDB,
    mutation: SubscriptionCallbackMutation<S>,
    state: S,
  ) => void
  restore: (
    storage: LevelDB,
    metadata: StoreMetadata,
    state: S,
  ) => Promise<Partial<S>>
}

export const STORE_SCHEMA_VERSION = 4

declare module 'pinia' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    /**
     * Persist store in storage.
     * @docs https://github.com/prazdevs/pinia-plugin-persistedstate.
     */
    storage?: StorageOptions<S>
  }

  export interface PiniaCustomProperties {
    // you can define simpler values too
    restored: Promise<boolean>
  }
}

export default boot(({ app }) => {
  // const walletStore = useWalletStore()
  const pinia = createPinia()

  app.use(pinia)
  const storage = level('vuex-store')
  const metadataPromise = new Promise<StoreMetadata>(resolve => {
    storage
      .get('storeMetadata')
      .then(data => {
        const state = JSON.parse(data)
        resolve({
          networkName: pathOr(displayNetwork, ['networkName'], state),
          version: pathOr(STORE_SCHEMA_VERSION, ['version'], state),
        })
      })
      .catch(() => {
        resolve({
          networkName: displayNetwork,
          version: STORE_SCHEMA_VERSION,
        })
      })
  })

  pinia.use(({ store, options }) => {
    const chatStore = store
    if (!options.storage) {
      return { restored: Promise.resolve(true) }
    }
    const { save, restore } = options.storage

    const restored = metadataPromise.then(
      metadata =>
        new Promise<boolean>(resolve => {
          restore(storage, metadata, store.$state).then(partialState => {
            store.$patch(partialState)
            resolve(true)
          })
        }),
    )

    chatStore.$subscribe((_mutation, state) => {
      save(storage, _mutation, state)
    })

    return {
      restored,
    }
  })
})
