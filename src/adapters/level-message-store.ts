import { LevelMessageStore } from '../relay/storage/level-storage'
import { remote } from 'electron'
const app = remote.app

const appData = app.getPath('appData')
export const store = new LevelMessageStore(appData)
