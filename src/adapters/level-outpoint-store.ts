import { LevelOutpointStore } from '../wallet/storage/level-storage'
import { remote } from 'electron'
import process from 'process'

const app = remote.app
const appData = app.getPath('appData')

export const store = new LevelOutpointStore(appData)

store.Open()

process.on('exit', (/* code */) => {
  store.Close()
})
