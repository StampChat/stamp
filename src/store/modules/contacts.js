import { PublicKey } from 'bitcore-lib-cash'
import addressmetadata from '../../keyserver/addressmetadata_pb'
import VCard from 'vcf'
import Vue from 'vue'

export default {
  namespaced: true,
  state: {
    contacts: {
      // Example:
      // 'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
      //   keyserver: {
      //     name: 'Anon',
      //     bio: '',
      //     avatar: ...,
      //     pubKey: ...,
      //   },
      //   relay: {
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
    getContactKeyserver: (state) => (addr) => {
      return state.contacts[addr].keyserver
    },
    getContactRelay: (state) => (addr) => {
      return state.contacts[addr].keyserver
    },
    getPubKey: (state) => (addr) => {
      let arr = Uint8Array.from(Object.values(state.contacts[addr].keyserver.pubKey))
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
        if (contacts[key].keyserver.name.toLowerCase().includes(lowerSearch) || key.toLowerCase().includes(lowerSearch)) {
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
    updateContactKeyserver (state, { addr, keyserver }) {
      if (addr in state.contacts) {
        state.contacts[addr].keyserver = keyserver
      }
    },
    updateContactRelay (state, { addr, relay }) {
      if (addr in state.contacts) {
        state.contacts[addr].relay = relay
      }
    },
    setNotify (state, { addr, value }) {
      state.contacts[addr].notify = value
    },
    deleteContact (state, addr) {
      Vue.delete(state.contacts, addr)
    },
    setPubKey (state, { addr, pubKey }) {
      state.contacts[addr].keyserver.pubKey = pubKey
    }
  },
  actions: {
    setNotify ({ commit }, { addr, value }) {
      commit('setNotify', { addr, value })
    },
    addLoadingContact ({ commit }, { addr, pubKey }) {
      let contact = {
        keyserver: {
          name: 'Loading...',
          bio: null,
          avatar: null,
          pubKey
        },
        relay: {
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
      let metadata = await handler.uniformSample(addr)

      // Get PubKey
      let pubKey = metadata.getPubKey()

      let payload = addressmetadata.Payload.deserializeBinary(
        metadata.getSerializedPayload())

      // Find vCard
      function isVCard (entry) {
        return entry.getKind() === 'vcard'
      }
      let entryList = payload.getEntriesList()
      let rawCard = entryList.find(isVCard)
        .getEntryData() // TODO: Cancel if not found
      let strCard = new TextDecoder().decode(rawCard)
      let vCard = new VCard().parse(strCard)

      let name = vCard.data.fn._data

      // TODO
      // let bio = vCard.data.note._data
      let bio = ''

      // Get avatar
      function isAvatar (entry) {
        return entry.getKind() === 'avatar'
      }
      let avatarEntry = entryList.find(isAvatar)
      let rawAvatar = avatarEntry.getEntryData()
      function _arrayBufferToBase64 (buffer) {
        var binary = ''
        var bytes = new Uint8Array(buffer)
        var len = bytes.byteLength
        for (var i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return window.btoa(binary)
      }
      let value = avatarEntry.getHeadersList()[0].getValue()
      let avatarDataURL = 'data:' + value + ';base64,' + _arrayBufferToBase64(rawAvatar)

      let keyserver = {
        name,
        bio,
        avatar: avatarDataURL,
        pubKey
      }
      let oldKeyserver = getters['getContactKeyserver'](addr)

      // If keyserver values changed, then update
      if (
        keyserver.name !== oldKeyserver.name ||
        keyserver.bio !== oldKeyserver.bio ||
        keyserver.avatar !== oldKeyserver.avatar
      ) {
        console.log(keyserver)
        console.log(oldKeyserver)
        commit('updateContactKeyserver', { addr, keyserver })
      }

      // Get fee
      let acceptancePrice
      try {
        let client = rootGetters['relayClient/getClient']
        let filters = await client.getFilter(addr)
        let priceFilter = filters.getPriceFilter()
        acceptancePrice = priceFilter.getAcceptancePrice()
      } catch (err) {
        acceptancePrice = 'Unknown'
      }

      // If relay values changed, then update
      let relay = {
        acceptancePrice
      }
      let oldRelay = getters['getContactRelay'](addr)
      if (relay !== oldRelay) {
        commit('updateContactRelay', { addr, relay })
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
