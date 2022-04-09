import { defineStore } from 'pinia'

export interface State {
  profile: {
    name?: string
    bio?: string
    avatar?: string
  }
  inbox: {
    acceptancePrice?: number
  }
}

export const useProfileStore = defineStore('myProfile', {
  state: (): State => ({ profile: {}, inbox: {} }),
  actions: {
    setRelayData(relayData: State) {
      this.profile = relayData.profile
      this.inbox = relayData.inbox
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      storage.put('myProfile', JSON.stringify(state))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      let myProfile = '{}'
      try {
        myProfile = await storage.get('myProfile')
      } catch (err) {
        //
      }
      const deserializedProfile = JSON.parse(myProfile) as State
      return deserializedProfile
    },
  },
})
