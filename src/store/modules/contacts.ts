import type { Module } from 'vuex'
import { PublicKey } from 'bitcore-lib-xpi'

import { ReadOnlyRelayClient } from '../../cashweb/relay'
import { defaultUpdateInterval, pendingRelayData, defaultRelayUrl, keyservers, networkName, displayNetwork } from '../../utils/constants'
import { KeyserverHandler } from '../../cashweb/keyserver/handler'
import moment from 'moment'
import { toDisplayAddress } from '../../utils/address'

type Profile = {
  name?: string,
  bio?: string,
  avatar?: string,
  pubKey: number[]
}

type ContactState = {
  lastUpdateTime: number,
  notify: boolean,
  relayURL: string,
  profile: Profile,
  inbox: {
    acceptancePrice?: number;
  }
}

export type State = {
  contacts: Record<string, ContactState | undefined>,
  updateInterval: number,
}

export const defaultContactsState = {
  contacts: {},
  updateInterval: defaultUpdateInterval
}

export type RestorableState = State;

export function rehydrateContacts (contactState?: RestorableState): State {
  if (!contactState) {
    return defaultContactsState
  }

  // This is currentlœy a shim, we don't need any special rehydrate contact at this time.
  return { ...contactState, contacts: contactState.contacts ?? defaultContactsState.contacts }
}

const module: Module<State, unknown> = {
  namespaced: true,
  state: defaultContactsState,
  getters: {
    getUpdateInterval (state) {
      return state.updateInterval
    },
    getNotify: (state) => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress]?.notify : false
    },
    getRelayURL: (state) => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress]?.relayURL : defaultRelayUrl
    },
    isContact: (state) => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return (apiAddress in state.contacts)
    },
    getContact: (state) => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress] : { ...pendingRelayData, profile: { ...pendingRelayData.profile } }
    },
    getContacts: (state) => {
      return state.contacts
    },
    getContactProfile: (state) => (address: string) => {
      if (!address) {
        return { ...pendingRelayData.profile }
      }
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress] ? state.contacts[apiAddress]?.profile : { ...pendingRelayData.profile }
    },
    getAcceptancePrice: (state) => (address: string) => {
      const apiAddress = toDisplayAddress(address)

      return state.contacts[apiAddress]?.inbox.acceptancePrice
    },
    getPubKey: (state) => (address: string) => {
      const apiAddress = toDisplayAddress(address)
      const contact = state.contacts[apiAddress]
      if (!contact || !contact?.profile) {
        return undefined
      }
      const arr = Uint8Array.from(Object.values(contact.profile.pubKey))
      return PublicKey.fromBuffer(arr)
    }
  },
  mutations: {
    addContact (state, { address, contact }) {
      const fixedContact = { ...contact, profile: { ...contact.profile, pubKey: contact.profile.pubKey } }
      const apiAddress = toDisplayAddress(address)

      state.contacts[apiAddress] = fixedContact
    },
    setUpdateInterval (state, interval) {
      state.updateInterval = interval
    },
    updateContact (state, { address, profile, inbox }: ContactState & { address: string }) {
      const apiAddress = toDisplayAddress(address)
      const contact = state.contacts[apiAddress]
      if (!contact) {
        return
      }
      contact.lastUpdateTime = moment().valueOf()
      contact.profile = profile || contact.profile
      contact.inbox = inbox || contact.inbox
    },
    setNotify (state, { address, value }) {
      const apiAddress = toDisplayAddress(address)
      const contact = state.contacts[apiAddress]
      if (!contact) {
        return
      }
      contact.notify = value
    },
    deleteContact (state, address) {
      const apiAddress = toDisplayAddress(address)

      delete state.contacts[apiAddress]
    },
    setPubKey (state, { address, pubKey }) {
      const apiAddress = toDisplayAddress(address)
      const contact = state.contacts[apiAddress]
      if (!contact) {
        return
      }
      contact.profile.pubKey = pubKey
    }
  },
  actions: {
    addLoadingContact ({ commit }, { address, pubKey }) {
      const contact = { ...pendingRelayData, profile: { ...pendingRelayData.profile, pubKey: Object.freeze(pubKey) } }
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
    addDefaultContact ({ commit, getters }, defaultContact) {
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
    deleteChat ({ commit }, address: string) {
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
        const handler = new KeyserverHandler({ networkName, keyservers })
        const relayURL = await handler.getRelayUrl(address)
        if (!relayURL) {
          throw new Error(`Unable to find relay url for ${address}`)
        }

        const relayClient = new ReadOnlyRelayClient(relayURL, networkName, displayNetwork)
        const relayData = await relayClient.getRelayData(address)
        commit('updateContact', { address, profile: relayData.profile, inbox: relayData.inbox })
      } catch (err) {
        console.error(err)
      }
    }
  }
}

export default module
