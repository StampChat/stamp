import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
  app.config.globalProperties.updateBadge = (unread: number) => {
    window.badge.updateBadge(1)
    window.badge.setBadgeCount(unread)
  }

  app.config.globalProperties.openURL = (url: string) => {
    window.url.open(url)
  }
})
