import { PublicKey } from 'bitcore-lib-cash'
import addressmetadata from '../../keyserver/addressmetadata_pb'
import VCard from 'vcf'

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
    }
  },
  mutations: {
    updateContact (state, { addr, profile }) {
      state.profiles[addr] = profile
    },
    deleteContact (state, addr) {
      delete state.profiles[addr]
    }
  },
  actions: {
    addLoadingContact ({ commit }, addr) {
      let profile = {
        name: 'Loading...',
        bio: null,
        avatar: null,
        acceptancePrice: 'Unknown',
        pubKey: null
      }
      commit('updateContact', { addr, profile })
    },
    deleteContact ({ commit }, addr) {
      commit('chats/deleteChat', addr, { root: true })
      commit('deleteContact', addr)
    },
    addContact ({ commit }, { addr, profile }) {
      commit('chats/addChatPre', addr, { root: true })
      commit('updateContact', { addr, profile })
      commit('chats/addChatPost', addr, { root: true })
    },
    deleteChat ({ commit }, addr) {
      commit('chats/deleteChat', addr, { root: true })
    },
    async refresh ({ commit }, addr) {
      // Make this generic over networks

      // Get metadata
      let metadata = await this.state.keyserverHandler.handler.uniformSample(addr)

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
        let client = this.state.relayClient.client
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
    startProfileUpdater ({ dispatch }) {
      setInterval(() => {
        for (let addr in this.state.contacts.profiles) {
          dispatch('refresh', addr)
        }
      }, 1000)
    }
  }
}
