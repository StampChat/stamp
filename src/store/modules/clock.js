export default {
    state: { now: Date.now() },
    mutations: {
        updateClock (state) {
            state.now = Date.now()
        }
    },
    actions: {
        startClock ({ commit }) {
            setInterval(() => { commit('updateClock') }, 1000)
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
