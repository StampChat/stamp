import enUS from './en-us'
import frFR from './fr-fr'

const defaultLocale = 'en-us'

const messages = {
  'en-us': enUS,
  'fr-fr': frFR,
}

const translatedLocaleOptions = [
  { value: 'en-us', label: 'English' },
  { value: 'fr-fr', label: 'Français' },
]

export { messages, defaultLocale, translatedLocaleOptions as localeOptions }
