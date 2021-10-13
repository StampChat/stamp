
import type { Module } from 'vuex'

type State = {
  profile: {
    name?: string,
    bio?: string,
    avatar?: string,
  },
  inbox: {
    acceptancePrice?: number;
  }
}

type RootState = any;

const module: Module<State, RootState> = {
  namespaced: true,
  state: { profile: {}, inbox: {} },
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

export default module
