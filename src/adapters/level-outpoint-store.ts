import { LevelOutpointStore } from '../wallet/storage/level-storage'
import { remote } from 'electron'
const app = remote.app

const appData = app.getPath('appData')
export const store = new LevelOutpointStore(appData)
