import { boot } from 'quasar/wrappers'
import { Plugins } from '@capacitor/core'
const { Browser } = Plugins

export default boot(({ Vue }) => {
  Vue.prototype.updateBadge = function () {
    // do nothing
  }

  Vue.prototype.openURL = (url: string) => {
    Browser.open({ url })
  }
})
