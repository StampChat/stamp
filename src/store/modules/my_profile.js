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
    setProfile (state, profile) {
      state.profile = profile
    },
    setInbox (state, inbox) {
      state.inbox = inbox
    },
    setRelayData (state, relayData) {
      state.profile = relayData.profile
      state.inbox = relayData.inbox
    },
    setAcceptancePrice (state, acceptancePrice) {
      state.inbox.acceptancePrice = acceptancePrice
    }
  },
  actions: {
    setProfile ({ commit }, profile) {
      commit('setProfile', profile)
    },
    setInbox ({ commit }, inbox) {
      commit('setInbox', inbox)
    },
    setRelayData ({ commit }, relayData) {
      commit('setRelayData', relayData)
    },
    setAcceptancePrice ({ commit }, acceptancePrice) {
      commit('setAcceptancePrice', acceptancePrice)
    }
  }

}
