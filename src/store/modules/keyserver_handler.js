import KeyserverHandler from '../../keyserver/handler'

export default {
  namespaced: true,
  state: { handler: new KeyserverHandler() },
  mutations: {
    setHandler (state, handler) {
      state.handler = handler
    }
  },
  actions: {
    setHandler ({ commit }, handler) {
      commit('setHandler', handler)
    }
  },
  getters: {
    getHandler (state) {
      return state.handler
    }
  }
}
