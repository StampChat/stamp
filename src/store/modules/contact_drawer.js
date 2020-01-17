export default {
    namespaced: true,
    state: { drawerOpen: false },
    mutations: {
        toggleDrawerOpen (state) {
            state.drawerOpen = !state.drawerOpen
        },
        setDrawerOpen (state, val) {
            state.drawerOpen = val
        }
    },
    getters: {
        getDrawerOpen (state) {
            return state.drawerOpen
        }
    },
    actions: {
        toggleDrawerOpen ({ commit }) {
            commit('toggleDrawerOpen')
        },
        setDrawerOpen ({ commit }, val) {
            commit('setDrawerOpen', val)
        }
    }

}
