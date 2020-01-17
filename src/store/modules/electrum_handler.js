export default {
    namespaced: true,
    state: { client: null, connected: false },
    mutations: {
        setClient (state, client) {
            state.client = client
        },
        setConnected (state, connected) {
            state.connected = connected
        }
    },
    actions: {
        setConnected ({ commit }, connected) {
            commit('setConnected', connected)
        },
        setClient ({ commit, dispatch }, client) {
            client.connect()
                .then(() => { dispatch('setConnected', true) })
                .catch(() => dispatch('setConnected', false))
            commit('setClient', client)
        }
    },
    getters: {
        getClient (state) {
            return state.client
        },
        connected (state) {
            return state.connected
        }
    }
}
