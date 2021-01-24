import { PublicKey } from 'bitcore-lib-cash'
import { getRelayClient } from '../../adapters/vuex-relay-adapter'
import { defaultUpdateInterval, pendingRelayData, defaultRelayUrl } from '../../utils/constants'
import KeyserverHandler from '../../keyserver/handler'
import Vue from 'vue'
import moment from 'moment'
import { toAPIAddress } from '../../utils/address'

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
    contacts: {},
    updateInterval: defaultUpdateInterval
  },
  getters: {
    getUpdateInterval (state) {
      return state.updateInterval
    },
    getNotify: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress].notify : false
    },
    getRelayURL: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress].relayURL : defaultRelayUrl
    },
    isContact: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return (apiAddress in state.contacts)
    },
    getContact: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress] : { ...pendingRelayData, profile: { ...pendingRelayData.profile } }
    },
    getContacts: (state) => {
      return state.contacts
    },
    getContactProfile: (state) => (address) => {
      if (!address) {
        return { ...pendingRelayData.profile }
      }
      const apiAddress = toAPIAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress].profile : { ...pendingRelayData.profile }
    },
    getAcceptancePrice: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return state.contacts[apiAddress].inbox.acceptancePrice
    },
    getPubKey: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      if (!state.contacts[apiAddress] || !state.contacts[apiAddress].profile) {
        return undefined
      }
      const arr = Uint8Array.from(Object.values(state.contacts[apiAddress].profile.pubKey))
      return PublicKey.fromBuffer(arr)
    }
  },
  mutations: {
    addContact (state, { address, contact }) {
      const apiAddress = toAPIAddress(address)

      Vue.set(state.contacts, apiAddress, contact)
    },
    setUpdateInterval (state, interval) {
      state.updateInterval = interval
    },
    updateContact (state, { address, profile, inbox }) {
      const apiAddress = toAPIAddress(address)
      if (!(address in state.contacts)) {
        return
      }
      state.contacts[apiAddress].lastUpdateTime = moment().valueOf()
      state.contacts[apiAddress].profile = profile || state.contacts[apiAddress].profile
      state.contacts[apiAddress].inbox = inbox || state.contacts[apiAddress].inbox
    },
    setNotify (state, { address, value }) {
      const apiAddress = toAPIAddress(address)

      if (!state.contacts[apiAddress]) {
        return
      }
      state.contacts[apiAddress].notify = value
    },
    deleteContact (state, address) {
      const apiAddress = toAPIAddress(address)

      Vue.delete(state.contacts, apiAddress)
    },
    setPubKey (state, { address, pubKey }) {
      const apiAddress = toAPIAddress(address)

      state.contacts[apiAddress].profile.pubKey = pubKey
    }
  },
  actions: {
    addLoadingContact ({ commit }, { address, pubKey }) {
      const contact = { ...pendingRelayData, profile: { ...pendingRelayData.profile, pubKey } }
      commit('addContact', { address, contact })
    },
    deleteContact ({ commit }, address) {
      commit('chats/clearChat', address, { root: true })
      commit('chats/deleteChat', address, { root: true })
      commit('deleteContact', address)
    },
    addContact ({ commit }, { address, contact }) {
      commit('addContact', { address, contact })
      commit('chats/setActiveChat', address, { root: true })
    },
    addDefaultContact ({ commit, getters, dispatch }, defaultContact) {
      if (getters.isContact(defaultContact.address)) {
        return
      }
      console.log('adding default contact', defaultContact.address)
      const contact = {
        ...pendingRelayData,
        profile: {
          ...pendingRelayData.profile,
          name: defaultContact.name
        }
      }
      commit('addContact', { address: defaultContact.address, contact })
      commit('chats/openChat', defaultContact.address, { root: true })
    },
    deleteChat ({ commit }, address) {
      commit('chats/deleteChat', address, { root: true })
    },
    refreshContacts ({ getters, dispatch }) {
      for (const address of Object.keys(getters.getContacts)) {
        dispatch('refresh', address)
      }
    },
    async refresh ({ commit, getters }, address) {
      // Make this generic over networks
      const oldContactInfo = getters.getContact(address)
      const updateInterval = getters.getUpdateInterval
      const now = moment()
      const lastUpdateTime = oldContactInfo.lastUpdateTime
      const expired = lastUpdateTime && moment(lastUpdateTime).add(updateInterval, 'milliseconds').isBefore(now)
      const noPicture = oldContactInfo.profile && !oldContactInfo.profile.avatar
      if (!expired && !noPicture) {
        // Short circuit if we already updated this contact recently.
        console.log('skipping contact update, checked recently')
        return
      }
      console.log('Updating contact', address)

      // Get metadata
      try {
        const handler = new KeyserverHandler()
        const relayURL = await handler.getRelayUrl(address)

        const { client: relayClient } = await getRelayClient({ relayURL })
        const relayData = await relayClient.getRelayData(address)
        commit('updateContact', { address, profile: relayData.profile, inbox: relayData.inbox })
      } catch (err) {
        console.error(err)
      }
    }
  }
}
