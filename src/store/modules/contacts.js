import { PublicKey, Address, Networks } from 'bitcore-lib-cash'
import { getRelayClient } from '../../adapters/vuex-relay-adapter'
import { defaultUpdateInterval, pendingRelayData, defaultRelayUrl, displayNetwork, networkName } from '../../utils/constants'
import KeyserverHandler from '../../keyserver/handler'
import Vue from 'vue'
import moment from 'moment'
import networkPrefix from 'src/boot/network-prefix'

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
      return state.contacts[address] ? state.contacts[address].notify : false
    },
    getRelayURL: (state) => (address) => {
      return state.contacts[address] ? state.contacts[address].relayURL : defaultRelayUrl
    },
    isContact: (state) => (address) => {
      return (address in state.contacts)
    },
    getContact: (state) => (address) => {
      return state.contacts[address] ? state.contacts[address] : { ...pendingRelayData, profile: { ...pendingRelayData.profile } }
    },
    getContacts: (state) => {
      return state.contacts
    },
    getContactProfile: (state) => (address) => {
      return state.contacts[address] ? state.contacts[address].profile : { ...pendingRelayData.profile }
    },
    getAcceptancePrice: (state) => (address) => {
      return state.contacts[address].inbox.acceptancePrice
    },
    getPubKey: (state) => (address) => {
      if (!state.contacts[address] || !state.contacts[address].profile) {
        return undefined
      }
      const arr = Uint8Array.from(Object.values(state.contacts[address].profile.pubKey))
      return PublicKey.fromBuffer(arr)
    }
  },
  mutations: {
    addContact (state, { address, contact }) {
      Vue.set(state.contacts, address, contact)
    },
    setUpdateInterval (state, interval) {
      state.updateInterval = interval
    },
    updateContact (state, { address, profile, inbox }) {
      if (!(address in state.contacts)) {
        return
      }
      state.contacts[address].lastUpdateTime = moment().valueOf()
      state.contacts[address].profile = profile || state.contacts[address].profile
      state.contacts[address].inbox = inbox || state.contacts[address].inbox
    },
    setNotify (state, { address, value }) {
      if (!state.contacts[address]) {
        return
      }
      state.contacts[address].notify = value
    },
    deleteContact (state, address) {
      Vue.delete(state.contacts, address)
    },
    setPubKey (state, { address, pubKey }) {
      state.contacts[address].profile.pubKey = pubKey
    }
  },
  actions: {
    addLoadingContact ({ commit, dispatch }, { address, pubKey }) {
      console.log('Adding contact', address)
      // TODO: Make generic
      const parsedAddress = Address(address)
      const displayAddress = Address(parsedAddress.hashBuffer, Networks.get(displayNetwork)).toCashAddress()
      const legacyAddress = Address(parsedAddress.hashBuffer, Networks.get(networkName)).toLegacyAddress().toString()
      console.log('Adding contact', { address, displayAddress, legacyAddress })

      const contact = {
        ...pendingRelayData,
        profile: {
          ...pendingRelayData.profile, pubKey, name: displayAddress
        }
      }
      commit('addContact', { address: legacyAddress, contact })
      commit('chats/openChat', legacyAddress, { root: true })
      dispatch('refresh', legacyAddress)
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
      dispatch('refresh', defaultContact.address)
    },
    deleteChat ({ commit }, address) {
      commit('chats/deleteChat', address, { root: true })
    },
    async refresh ({ commit, getters }, address) {
      // Make this generic over networks
      const oldContactInfo = getters.getContact(address)
      const updateInterval = getters.getUpdateInterval
      const now = moment()
      const lastUpdateTime = oldContactInfo.lastUpdateTime
      if (lastUpdateTime && moment(lastUpdateTime).add(updateInterval, 'milliseconds').isAfter(now)) {
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
