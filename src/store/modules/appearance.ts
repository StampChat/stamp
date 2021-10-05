import type { Module } from 'vuex'

type State = {
  darkMode: boolean;
};

// TODO: replace after RootState is typed
type RootState = any

const module: Module<State, RootState> = {
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
