import { PublicKey } from 'bitcore-lib-cash'
import RelayClient from '../../relay/client'
import Vue from 'vue'

export default {
  namespaced: true,
  state: {
    contacts: {
      // Example:
      // 'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
      //   profile: {
      //     name: 'Anon',
      //     bio: '',
      //     avatar: ...,
      //     pubKey: ...,
      //   },
      //   inbox: {
      //     acceptancePrice: ...,
      //   },
      //   notify: true
      // },
    }
  },
  getters: {
    getNotify: (state) => (addr) => {
      return state.contacts[addr].notify
    },
    isContact: (state) => (addr) => {
      return (addr in state.contacts)
    },
    getContact: (state) => (addr) => {
      return state.contacts[addr]
    },
    getContactProfile: (state) => (addr) => {
      return state.contacts[addr].profile
    },
    getContactInbox: (state) => (addr) => {
      return state.contacts[addr].inbox
    },
    getPubKey: (state) => (addr) => {
      let arr = Uint8Array.from(Object.values(state.contacts[addr].profile.pubKey))
      return PublicKey.fromBuffer(arr)
    },
    getAll (state) {
      return state.contacts
    },
    searchContacts: (state) => (search) => {
      let result = {}
      let contacts = state.contacts
      for (let key in contacts) {
        let lowerSearch = search.toLowerCase()
        if (contacts[key].profile.name.toLowerCase().includes(lowerSearch) || key.toLowerCase().includes(lowerSearch)) {
          result[key] = contacts[key]
        }
      }

      return result
    }
  },
  mutations: {
    addContact (state, { addr, contact }) {
      Vue.set(state.contacts, addr, contact)
    },
    updateContactProfile (state, { addr, profile }) {
      if (addr in state.contacts) {
        state.contacts[addr].profile = profile
      }
    },
    updateContactRelay (state, { addr, inbox }) {
      if (addr in state.contacts) {
        state.contacts[addr].inbox = inbox
      }
    },
    setNotify (state, { addr, value }) {
      state.contacts[addr].notify = value
    },
    deleteContact (state, addr) {
      Vue.delete(state.contacts, addr)
    },
    setPubKey (state, { addr, pubKey }) {
      state.contacts[addr].profile.pubKey = pubKey
    }
  },
  actions: {
    setNotify ({ commit }, { addr, value }) {
      commit('setNotify', { addr, value })
    },
    addLoadingContact ({ commit }, { addr, pubKey }) {
      let contact = {
        profile: {
          name: 'Loading...',
          bio: null,
          avatar: null,
          pubKey
        },
        inbox: {
          acceptancePrice: 'Unknown'
        },
        notify: true
      }
      commit('addContact', { addr, contact })
    },
    deleteContact ({ commit }, addr) {
      commit('chats/clearChat', addr, { root: true })
      commit('chats/deleteChat', addr, { root: true })
      commit('deleteContact', addr)
    },
    addContact ({ commit }, { addr, contact }) {
      commit('addContact', { addr, contact })
      commit('chats/openChat', addr, { root: true })
    },
    deleteChat ({ commit }, addr) {
      commit('chats/deleteChat', addr, { root: true })
    },
    async refresh ({ commit, rootGetters, getters }, addr) {
      // Make this generic over networks

      // Get metadata
      let handler = rootGetters['keyserverHandler/getHandler']
      try {
        let relayURL = await handler.getRelayUrl(addr)
        let relayClient = new RelayClient(relayURL)
        var relayData = relayClient.getRelayData(addr)
      } catch (err) {
        console.error(err)
        return
      }

      let oldRelayData = getters['getContact'](addr)

      // If profile values changed, then update
      if (
        relayData.profile.name !== oldRelayData.profile.name ||
        relayData.profile.bio !== oldRelayData.profile.bio ||
        relayData.profile.avatar !== oldRelayData.profile.avatar
      ) {
        commit('updateContactProfile', { addr, profile: relayData.profile })
      }

      // If relay values changed, then update
      if (relayData.inbox !== oldRelayData.inbox) {
        commit('updateContactRelay', { addr, inbox: relayData.inbox })
      }
    },
    startContactUpdater ({ dispatch, getters }) {
      setInterval(() => {
        let contacts = getters['getAll']
        for (let addr in contacts) {
          dispatch('refresh', addr)
        }
      }, 10000)
    }
  }
}
