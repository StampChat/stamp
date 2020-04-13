export default {
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
    setDarkMode (state, darkMode) {
      state.darkMode = darkMode
    }
  },
  actions: {
    setDarkMode ({ commit }, darkMode) {
      commit('setDarkMode', darkMode)
    }
  }
}
