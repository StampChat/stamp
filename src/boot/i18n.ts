import { messages, defaultLocale } from 'src/i18n'
import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
// you'll need to create the src/i18n/index.js file too

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  globalInjection: true,
  messages,
})

export default boot(({ app }) => {
  // Set i18n instance on app
  app.use(i18n)
})

export { i18n }
