import type { Module } from 'vuex'

type State = {
  profile: {
    name: string | null;
    bio: string | null;
    avatar: string | null;
  };
  inbox: {
    acceptancePrice: number | null;
  };
};

// TODO: replace after RootState is typed
type RootState = any

const module: Module<State, RootState> = {
  namespaced: true,
  state: {
    profile: { name: null, bio: null, avatar: null },
    inbox: { acceptancePrice: null }
  },
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
    setRelayData (state, relayData: State) {
      state.profile = relayData.profile
      state.inbox = relayData.inbox
    }
  }
}

export default module
