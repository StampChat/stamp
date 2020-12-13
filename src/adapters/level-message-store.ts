import { LevelMessageStore } from '../relay/storage/level-storage'
import { Platform } from 'quasar'

async function createStore (): Promise<LevelMessageStore> {
  if (Platform.is.electron) {
    const process = await import('process')
    const electron = await import('electron')
    const app = electron.remote.app
    const appData = app.getPath('appData')

    const store = new LevelMessageStore(appData)

    process.on('exit', (/* code */) => {
      store.Close()
    })

    store.Open()

    return store
  }
  const store = new LevelMessageStore('MessageStore')
  store.Open()

  // Path doesn't matter. We're using indexdb
  return store
}

export const store = createStore()
