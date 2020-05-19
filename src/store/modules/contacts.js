import { PublicKey, Address } from 'bitcore-lib-cash'
import { getRelayClient } from '../../utils/relay-client-factory'
import { addressColorFromStr } from '../../utils/formatting'
import { defaultUpdateInterval, pendingRelayData } from '../../utils/constants'
import KeyserverHandler from '../../keyserver/handler'
import Vue from 'vue'
import moment from 'moment'

export function rehydrateContacts (contactState) {
  if (!contactState) {
    return
  }

  // This is currentlœy a shim, we don't need any special rehydrate contact at this time.
  contactState.contacts = contactState.contacts || {}
}

export default {
  namespaced: true,
  state: {
    contacts: {
      // Example:
      // 'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
      //   lastUpdate: ...
      //   profile: {
      //     name: 'Anon',
      //     bio: '',
      //     avatar: ...,
      //     pubKey: ...,
      //   },
      //   inbox: {
      //     acceptancePrice: ...,
      //   },
      //   notify: true,
      //   relayURL: ...
      // },
    },
    updateInterval: defaultUpdateInterval
  },
  getters: {
    getUpdateInterval (state) {
      return state.updateInterval
    },
    getNotify: (state) => (addr) => {
      return state.contacts[addr].notify
    },
    getRelayURL: (state) => (addr) => {
      return state.contacts[addr].relayURL
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
    getAcceptancePrice: (state) => (addr) => {
      return state.contacts[addr].inbox.acceptancePrice
    },
    getPubKey: (state) => (addr) => {
      const arr = Uint8Array.from(Object.values(state.contacts[addr].profile.pubKey))
      return PublicKey.fromBuffer(arr)
    },
    searchContacts: (state) => (search) => {
      const result = {}
      const contacts = state.contacts
      for (const key in contacts) {
        const lowerSearch = search.toLowerCase()
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
    setUpdateInterval (state, interval) {
      state.updateInterval = interval
    },
    updateContact (state, { addr, profile, inbox }) {
      if (!(addr in state.contacts)) {
        return
      }
      state.contacts[addr].lastUpdateTime = moment().valueOf()
      state.contacts[addr].profile = profile || state.contacts[addr].profile
      state.contacts[addr].inbox = inbox || state.contacts[addr].inbox
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
    addLoadingContact ({ commit }, { addr, pubKey }) {
      /// Add color
      const color = addressColorFromStr(addr)

      const contact = { ...pendingRelayData, profile: { ...pendingRelayData.profile, pubKey }, color }
      commit('addContact', { addr, contact })
    },
    deleteContact ({ commit }, addr) {
      commit('chats/clearChat', addr, { root: true })
      commit('chats/deleteChat', addr, { root: true })
      commit('deleteContact', addr)
    },
    addContact ({ commit }, { addr, contact }) {
      /// Add color
      contact.color = addressColorFromStr(addr)

      commit('addContact', { addr, contact })
      commit('chats/setActiveChat', addr, { root: true })
    },
    deleteChat ({ commit }, addr) {
      commit('chats/deleteChat', addr, { root: true })
    },
    async refresh ({ commit, getters }, addr) {
      // Make this generic over networks
      const oldContactInfo = getters.getContact(addr)
      const updateInterval = getters.getUpdateInterval
      const now = moment()
      const lastUpdateTime = oldContactInfo.lastUpdateTime
      if (lastUpdateTime && moment(lastUpdateTime).add(updateInterval, 'milliseconds').isAfter(now)) {
        // Short circuit if we already updated this contact recently.
        console.log('skipping contact update, checked recently')
        return
      }
      console.log('Updating contact', addr)

      // Get metadata
      try {
        const handler = new KeyserverHandler()
        const relayURL = await handler.getRelayUrl(addr)

        const { client: relayClient } = getRelayClient({ relayURL })
        const relayData = await relayClient.getRelayData(addr)
        commit('updateContact', { addr, profile: relayData.profile, inbox: relayData.inbox })
      } catch (err) {
        console.error(err)
      }
    }
  }
}
