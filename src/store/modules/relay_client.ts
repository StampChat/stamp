import type { Module } from 'vuex'

type State = {
  token: string | null;
};

// TODO: replace after RootState is typed
type RootState = any;

const module: Module<State, RootState> = {
  namespaced: true,
  state: {
    token: null
  },
  mutations: {
    setToken (state, token: string) {
      state.token = token
    }
  },
  actions: {
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
