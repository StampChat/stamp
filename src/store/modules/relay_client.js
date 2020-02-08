import RelayClient from '../../relay/client'

export default {
  namespaced: true,
  state: {
    client: null,
    token: null,
    connected: true
  },
  mutations: {
    setConnected (state, connected) {
      state.connected = connected
    },
    setClient (state, client) {
      state.client = client
    },
    setToken (state, token) {
      state.token = token
    },
    rehydrate (state) {
      if (state.client !== null) {
        state.client = new RelayClient(state.client.url)
      }
    }
  },
  actions: {
    setConnected ({ commit }, connected) {
      commit('setConnected', connected)
    },
    setClient ({ commit }, client) {
      commit('setClient', client)
    },
    setToken ({ commit }, token) {
      commit('setToken', token)
    },
    rehydrate ({ commit }) {
      commit('rehydrate')
    }
  },
  getters: {
    connected (state) {
      return state.connected
    },
    getClient (state) {
      return state.client
    },
    getToken (state) {
      return state.token
    }
  }
}
