import { defineStore } from 'pinia'

export interface State {
  darkMode: boolean
  lastDismissed: number
}

export const useAppearanceStore = defineStore('appearance', {
  state: (): State => ({
    darkMode: false,
    lastDismissed: 0,
  }),
  actions: {
    setDarkMode(darkMode: boolean) {
      this.darkMode = darkMode
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      storage.put('appearance', JSON.stringify(state))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      let appearance = '{}'
      try {
        appearance = await storage.get('appearance')
      } catch (err) {
        //
      }
      const deserializedProfile = JSON.parse(appearance) as State
      return deserializedProfile
    },
  },
})
