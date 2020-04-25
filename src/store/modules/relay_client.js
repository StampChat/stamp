export default {
  namespaced: true,
  state: {
    token: null
  },
  mutations: {
    setClient (state, client) {
      state.client = client
    },
    setToken (state, token) {
      state.token = token
    }
  },
  actions: {
    setConnected ({ commit }, connected) {
      commit('setConnected', connected)
    },
    setToken ({ commit }, token) {
      commit('setToken', token)
    }
  },
  getters: {
    getToken (state) {
      return state.token
    }
  }
}
