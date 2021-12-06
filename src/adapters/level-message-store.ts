import { LevelMessageStore } from '../cashweb/relay/storage/level-storage'
// import { Platform } from 'quasar'

async function createStore(): Promise<LevelMessageStore> {
  // if (Platform.is.electron) {
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   return (window as any).messageStore
  // }
  const store = new LevelMessageStore('MessageStore')
  store.Open()

  // Path doesn't matter. We're using indexdb
  return store
}

export const store = createStore()
