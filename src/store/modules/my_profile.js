export default {
  namespaced: true,
  state: { profile: { name: null, bio: null, avatar: null }, inbox: { acceptancePrice: null } },
  getters: {
    getRelayData (state) {
      return state
    },
    getProfile (state) {
      return state.profile
    },
    getInbox (state) {
      return state.inbox
    }
  },
  mutations: {
    setRelayData (state, relayData) {
      state.profile = relayData.profile
      state.inbox = relayData.inbox
    }
  }
}
