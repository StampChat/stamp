import { defineStore } from 'pinia'

export interface State {
  token: string | null
}

export const useRelayClientStore = defineStore('relayClient', {
  state: (): State => ({ token: null }),
  actions: {
    setToken(token: string) {
      this.token = token
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      storage.put('relayClient', JSON.stringify(state))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      let relayClient = '{}'
      try {
        relayClient = await storage.get('relayClient')
      } catch (err) {
        //
      }
      const deserializedRelayClient = JSON.parse(relayClient) as State
      return deserializedRelayClient
    },
  },
})
