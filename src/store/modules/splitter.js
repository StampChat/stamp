export default {
    state: { splitterRatio: 20 },
    mutations: {
        setSplitterRatio (state, ratio) {
            state.splitterRatio = ratio
        }
    },
    getters: {
        getSplitterRatio (state) {
            return state.splitterRatio
        }
    },
    actions: {
        setSplitterRatio ({ commit }, val) {
            commit('setSplitterRatio', val)
        }
    }
}
