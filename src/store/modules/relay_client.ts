import type { Module } from 'vuex'

export type State = {
  token?: string
}

const module: Module<State, unknown> = {
  namespaced: true,
  state: {},
  mutations: {
    setToken(state, token: string) {
      state.token = token
    },
  },
  actions: {
    setToken({ commit }, token: string) {
      commit('setToken', token)
    },
  },
  getters: {
    getToken(state) {
      return state.token
    },
  },
}

export default module
