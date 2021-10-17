import type { Module } from 'vuex'

export type State = {
  darkMode: boolean;
};

const module: Module<State, unknown> = {
  namespaced: true,
  state: {
    darkMode: false
  },
  getters: {
    getDarkMode (state) {
      return state.darkMode
    }
  },
  mutations: {
    setDarkMode (state, darkMode: boolean) {
      state.darkMode = darkMode
    }
  },
  actions: {
    setDarkMode ({ commit }, darkMode: boolean) {
      commit('setDarkMode', darkMode)
    }
  }
}

export default module
