export default {
  namespaced: true,
  state: { name: null, bio: null, avatar: null, acceptancePrice: null },
  getters: {
    getMyProfile (state) {
      return state
    },
    getAcceptancePrice (state) {
      return state.acceptancePrice
    }
  },
  mutations: {
    setMyProfile (state, { name, avatar, bio }) {
      state.name = name
      state.avatar = avatar
      state.bio = bio
    },
    setAcceptancePrice (state, fee) {
      state.acceptancePrice = fee
    }
  },
  actions: {
    setMyProfile ({ commit }, profile) {
      commit('setMyProfile', profile)
    },
    setAcceptancePrice ({ commit }, fee) {
      commit('setAcceptancePrice', fee)
    }
  }

}
