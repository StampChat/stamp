export default {
  state: { now: Date.now() },
  mutations: {
    updateClock (state) {
      state.now = Date.now()
    }
  },
  actions: {
    startClock ({ commit }) {
      setInterval(() => { commit('updateClock') }, 5000)
    },
    updateClock ({ commit }) {
      commit('updateClock')
    }
  },
  getters: {
    getUnixTime (state) {
      return state.now
    }
  }
}
