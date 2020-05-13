export default {
  namespaced: true,
  state: {
    darkMode: false,
    currencyFormat: {
      type: 'fiat',
      conversion: 0.000002
    }
  },
  getters: {
    getDarkMode (state) {
      return state.darkMode
    },
    getCurrencyFormat (state) {
      return state.currencyFormat
    }
  },
  mutations: {
    setDarkMode (state, darkMode) {
      state.darkMode = darkMode
    },
    setCurrencyFormat (state, format) {
      state.currencyFormat = format
    }
  },
  actions: {
    setDarkMode ({ commit }, darkMode) {
      commit('setDarkMode', darkMode)
    },
    setCurrencyFormat ({ commit }, format) {
      commit('setCurrencyFormat', format)
    }
  }
}
