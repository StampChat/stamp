import RelayClient from '../../relay/client'

export default {
  namespaced: true,
  state: {
    client: null,
    token: null
  },
  mutations: {
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
    getClient (state) {
      return state.client
    },
    getToken (state) {
      return state.token
    }
  }
}
