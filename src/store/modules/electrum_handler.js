import { ElectrumClient } from 'electrumjs'
import { pingInterval } from '../../utils/constants'

export default {
  namespaced: true,
  state: {
    host: null,
    port: null,
    protocol: null,
    client: null,
    connected: false
  },
  mutations: {
    new (state, { port, host, protocol }) {
      let ecl = new ElectrumClient(host, port, protocol)
      state.client = ecl
      state.host = host
      state.port = port
      state.protocol = protocol
    },
    setConnected (state, connected) {
      state.connected = connected
    },
    rehydrate (state) {
      state.client = new ElectrumClient(state.host, state.port, state.protocol)
    },
    setErrorCallback (state, callback) {
      state.client.onError = callback
    }
  },
  actions: {
    setConnected ({ commit }, connected) {
      commit('setConnected', connected)
    },
    setClient ({ commit, dispatch }, client) {
      commit('setClient', client)
      commit('setErrorCallback', function (_err) {
        dispatch('setConnected', false)
      })
    },
    new ({ commit }, { port, host, protocol }) {
      commit('new', { port, host, protocol })
      commit('setErrorCallback', function (err) {
        console.error(err)
        commit('setConnected', false)
      })
    },
    rehydrate ({ commit }) {
      commit('rehydrate')
      commit('setErrorCallback', function (_err) {
        commit('setConnected', false)
      })
    },
    async connect ({ getters, commit }) {
      try {
        await getters['getClient'].connect()
        commit('setConnected', true)
      } catch (err) {
        console.error(err)
        commit('setConnected', false)
      }
    },
    async checkConnection ({ getters }) {
      try {
        await getters['getClient'].methods.server_ping()
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    },
    keepAlive ({ dispatch, getters }) {
      setTimeout(async () => {
        if (getters['connected']) {
          if (await dispatch('checkConnection')) {
            dispatch('setConnected', true)
          } else {
            dispatch('setConnected', false)
          }
        } else {
          await dispatch('connect')
        }
        await dispatch('keepAlive')
      }, pingInterval)
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
