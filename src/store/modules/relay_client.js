import RelayClient from '../relay/client'

export default {
  namespaced: true,
  state: {
    client: null, // TODO: Make this a variable
    token: null
  },
  mutations: {
    setClient (state, client) {
      state.client = client
    },
    setToken (state, token) {
      state.token = token
    },
    reinitialize (state) {
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
    reinitialize ({ commit }) {
      commit('reinitialize')
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
