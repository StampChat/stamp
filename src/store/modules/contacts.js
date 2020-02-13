import { PublicKey } from 'bitcore-lib-cash'
import addressmetadata from '../../keyserver/addressmetadata_pb'
import VCard from 'vcf'
import Vue from 'vue'

export default {
  namespaced: true,
  state: {
    profiles: {
      // Example:
      // 'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
      //   name: 'Anon',
      //   bio: '',
      //   avatar: ...,
      //   acceptancePrice: ...,
      //   pubKey: ...
      // },
    }
  },
  getters: {
    getNotify: (state) => (addr) => {
      return state.profiles[addr].notify
    },
    isContact: (state) => (addr) => {
      return (addr in state.profiles)
    },
    getContact: (state) => (addr) => {
      return state.profiles[addr]
    },
    getPubKey: (state) => (addr) => {
      let arr = Uint8Array.from(Object.values(state.profiles[addr].pubKey))
      return PublicKey.fromBuffer(arr)
    },
    getAll (state) {
      return state.profiles
    },
    searchContacts: (state) => (search) => {
      let result = {}
      let contacts = state.profiles
      for (let key in contacts) {
        let lowerSearch = search.toLowerCase()
        if (contacts[key].name.toLowerCase().includes(lowerSearch) || key.toLowerCase().includes(lowerSearch)) {
          result[key] = contacts[key]
        }
      }

      return result
    }
  },
  mutations: {
    addContact (state, { addr, profile }) {
      Vue.set(state.profiles, addr, profile)
    },
    updateContact (state, { addr, profile }) {
      if (addr in state.profiles) {
        state.profiles[addr] = {
          ...state.profiles[addr],
          ...profile
        }
      }
    },
    setNotify (state, { addr, value }) {
      state.profiles[addr].notify = value
    },
    deleteContact (state, addr) {
      Vue.delete(state.profiles, addr)
    }
  },
  actions: {
    setNotify ({ commit }, { addr, value }) {
      commit('setNotify', { addr, value })
    },
    addLoadingContact ({ commit }, { addr, pubKey }) {
      let profile = {
        name: 'Loading...',
        bio: null,
        avatar: null,
        acceptancePrice: 'Unknown',
        pubKey,
        notify: true
      }
      commit('addContact', { addr, profile })
    },
    deleteContact ({ commit }, addr) {
      commit('chats/clearChat', addr, { root: true })
      commit('chats/deleteChat', addr, { root: true })
      commit('deleteContact', addr)
    },
    addContact ({ commit }, { addr, profile }) {
      commit('chats/openChat', addr, { root: true })
      commit('addContact', { addr, profile })
    },
    deleteChat ({ commit }, addr) {
      commit('chats/deleteChat', addr, { root: true })
    },
    async refresh ({ commit, rootGetters }, addr) {
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

      let profile = {
        name,
        bio,
        avatar: avatarDataURL,
        acceptancePrice,
        pubKey
      }
      commit('updateContact', { addr, profile })
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
