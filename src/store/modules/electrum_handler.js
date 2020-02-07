const ElectrumClient = require('electrum-client')

export default {
  namespaced: true,
  state: {
    client: null,
    connected: false
  },
  mutations: {
    setClient (state, client) {
      state.client = client
    },
    setConnected (state, connected) {
      state.connected = connected
    },
    rehydrate (state) {
      state.client = new ElectrumClient(state.client.port, state.client.host, 'tcp')
      state.client.onError = function (err) {
        console.log(err)
        state.connected = false
      }
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
    rehydrate ({ commit, dispatch }) {
      commit('rehydrate')
      dispatch('connect')
    },
    connect ({ getters, dispatch }) {
      getters['getClient'].connect()
        .then(() => dispatch('setConnected', true))
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
