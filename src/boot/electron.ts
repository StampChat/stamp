import { boot } from 'quasar/wrappers'
import { remote, ipcRenderer, shell } from 'electron'

export default boot(({ Vue }) => {
  Vue.prototype.updateBadge = (unread: number) => {
    ipcRenderer.sendSync('update-badge', 1)
    remote.app.setBadgeCount(unread)
  }

  Vue.prototype.openURL = (url: string) => {
    shell.openExternal(url)
  }
})
