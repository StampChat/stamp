const ElectrumClient = require('electrum-client')

export default {
  namespaced: true,
  state: { client: null, connected: false },
  mutations: {
    setClient (state, client) {
      state.client = client
    },
    setConnected (state, connected) {
      state.connected = connected
    },
    reinitialize (state) {
      state.client = new ElectrumClient(state.client.port, state.client.host, 'tcp')
    }
  },
  actions: {
    setConnected ({ commit }, connected) {
      commit('setConnected', connected)
    },
    setClient ({ commit, dispatch }, client) {
      commit('setClient', client)
      dispatch('connect')
    },
    reinitialize ({ commit, dispatch }) {
      commit('reinitialize')
      dispatch('connect')
    },
    connect ({ getters, dispatch }) {
      getters['getClient'].connect()
        .then(() => { dispatch('setConnected', true) })
        .catch(() => dispatch('setConnected', false))
    }
  },
  getters: {
    getClient (state) {
      return state.client
    },
    connected (state) {
      return state.connected
    }
  }
}
