import { boot } from 'quasar/wrappers'
import { Plugins } from '@capacitor/core'
const { Browser } = Plugins

export default boot(({ app }) => {
  app.config.globalProperties.updateBadge = function () {
    // do nothing
  }

  app.config.globalProperties.openURL = (url: string) => {
    Browser.open({ url, windowName: '_blank' })
  }
})
