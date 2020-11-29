import { boot } from 'quasar/wrappers'
import { Plugins } from '@capacitor/core'
const { Browser } = Plugins

export default boot(({ Vue }) => {
  // NOP
  Vue.prototype.updateBadge = () => {
  }

  Vue.prototype.openURL = (url: string) => {
    Browser.open({ url })
  }
})
