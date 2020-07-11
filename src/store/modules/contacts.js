import { PublicKey } from 'bitcore-lib-cash'
import { getRelayClient } from '../../adapters/vuex-relay-adapter'
import { addressColorFromStr } from '../../utils/formatting'
import { defaultUpdateInterval, pendingRelayData, defaultRelayUrl } from '../../utils/constants'
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
      'bchtest:qrugj9hv6lcar6hflk26yz8k9qq8wp9tvsmvvqqwgq': {
        lastUpdate: null,
        profile: {
          name: 'Stamp Group Chat #1',
          pubKey: new Uint8Array([
            2,
            111,
            154,
            97,
            51,
            91,
            21,
            201,
            249,
            21,
            64,
            33,
            209,
            44,
            71,
            187,
            52,
            83,
            161,
            168,
            20,
            173,
            139,
            235,
            85,
            155,
            234,
            247,
            223,
            107,
            31,
            88,
            32
          ])
        },
        inbox: {
          acceptancePrice: 5000
        },
        notify: true,
        relayURL: defaultRelayUrl
      },
      'bchtest:qq3q7kzdds2xuzug05tn7w3lp7kkfulqfsf85x8tty': {
        lastUpdate: null,
        profile: {
          name: 'Harry',
          pubKey: new Uint8Array([
            3,
            14,
            10,
            67,
            80,
            209,
            189,
            177,
            180,
            42,
            144,
            28,
            56,
            182,
            94,
            167,
            89,
            227,
            104,
            46,
            174,
            234,
            241,
            72,
            197,
            63,
            184,
            232,
            181,
            16,
            198,
            7,
            191
          ])
        },
        inbox: {
          acceptancePrice: 5000
        },
        notify: true,
        relayURL: defaultRelayUrl
      },
      'bchtest:qqu3vqt9hydcmhkydn9h68qzlyduypuwqgnc8vvjhc': {
        lastUpdate: null,
        profile: {
          name: 'Shammah (Always Up)',
          pubKey: new Uint8Array([
            2,
            102,
            255,
            22,
            228,
            132,
            236,
            1,
            167,
            197,
            242,
            26,
            230,
            200,
            60,
            103,
            197,
            225,
            249,
            140,
            125,
            104,
            196,
            130,
            160,
            242,
            40,
            178,
            73,
            218,
            99,
            238,
            38
          ])
        },
        inbox: {
          acceptancePrice: 5000
        },
        notify: true,
        relayURL: defaultRelayUrl
      }
    },
    updateInterval: defaultUpdateInterval
  },
  getters: {
    getUpdateInterval (state) {
      return state.updateInterval
    },
    getNotify: (state) => (address) => {
      return state.contacts[address].notify
    },
    getRelayURL: (state) => (address) => {
      return state.contacts[address].relayURL
    },
    isContact: (state) => (address) => {
      return (address in state.contacts)
    },
    getContact: (state) => (address) => {
      return state.contacts[address]
    },
    getContactProfile: (state) => (address) => {
      return state.contacts[address].profile
    },
    getAcceptancePrice: (state) => (address) => {
      return state.contacts[address].inbox.acceptancePrice
    },
    getPubKey: (state) => (address) => {
      const arr = Uint8Array.from(Object.values(state.contacts[address].profile.pubKey))
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
    addLoadingContact ({ commit }, { address, pubKey }) {
      /// Add color
      const color = addressColorFromStr(address)

      const contact = { ...pendingRelayData, profile: { ...pendingRelayData.profile, pubKey }, color }
      commit('addContact', { address, contact })
    },
    deleteContact ({ commit }, address) {
      commit('chats/clearChat', address, { root: true })
      commit('chats/deleteChat', address, { root: true })
      commit('deleteContact', address)
    },
    addContact ({ commit }, { address, contact }) {
      /// Add color
      contact.color = addressColorFromStr(address)

      commit('addContact', { address, contact })
      commit('chats/setActiveChat', address, { root: true })
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

        const { client: relayClient } = getRelayClient({ relayURL })
        const relayData = await relayClient.getRelayData(address)
        commit('updateContact', { address, profile: relayData.profile, inbox: relayData.inbox })
      } catch (err) {
        console.error(err)
      }
    }
  }
}
