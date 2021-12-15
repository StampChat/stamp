import { LevelUtxoStore } from '../cashweb/wallet/storage/level-storage'

export async function createStore(): Promise<LevelUtxoStore> {
  const store = new LevelUtxoStore('outpointStorage')
  await store.Open()
  // Path doesn't matter. We're using indexdb
  return store
}

export const store = createStore()
