import RelayClient from 'src/cashweb/relay'
import type { Module } from 'vuex'

type State = {
  client: RelayClient | null;
  token: string | null;
};

// TODO: replace after RootState is typed
type RootState = any;

const module: Module<State, RootState> = {
  namespaced: true,
  state: {
    client: null,
    token: null
  },
  mutations: {
    setClient (state, client: RelayClient) {
      state.client = client
    },
    setToken (state, token: string) {
      state.token = token
    }
  },
  actions: {
    setConnected ({ commit }, connected: boolean) {
      commit('setConnected', connected)
    },
    setToken ({ commit }, token: string) {
      commit('setToken', token)
    }
  },
  getters: {
    getToken (state) {
      return state.token
    }
  }
}

export default module
