import { Plugins } from '@capacitor/core'
import { Platform } from 'quasar'
import { mobileNotify } from '../../utils/notifications'

const { App } = Plugins

export default {
  namespaced: true,
  state: {
    token: null,
    backgroundMessageStore: {
    }
  },
  mutations: {
    setClient (state, client) {
      state.client = client
    },
    setToken (state, token) {
      state.token = token
    },
    setBackgroundMessage (state, message) {
      const index = message.index
      state.backgroundMessageStore[index] = JSON.stringify(message)
    }
  },
  actions: {
    setConnected ({ commit }, connected) {
      commit('setConnected', connected)
    },
    setToken ({ commit }, token) {
      commit('setToken', token)
    },
    async receiveBackgroundMessage ({ commit, rootGetters }, { outbound, copartyAddress, index, newMsg }) {
      // Same logic in the action chat/receiveMessage but don't commit to the UI
      const acceptancePrice = rootGetters['myProfile/getInbox'].acceptancePrice

      const acceptable = (newMsg.stampValue >= acceptancePrice)
      // If not focused/active (and not outbox message) then notify
      if (!outbound && acceptable) {
        const contact = rootGetters['contacts/getContact'](copartyAddress)
        const textItem = newMsg.items.find(item => item.type === 'text') || { text: '' }
        // Only known contact can notify - will need to discuss intention
        if (contact && contact.notify) {
          if (Platform.is.mobile) {
            if (Platform.is.mobile) {
              const { isActive } = await App.getState()
              if (!isActive) {
                mobileNotify(contact.profile.name, textItem.text)
              }
            }
          }
        }
      }
      commit('setBackgroundMessage', { address: copartyAddress, index, newMsg })
    }
  },
  getters: {
    getToken (state) {
      return state.token
    },
    getBackgroundMessage: (state) => (payloadDigest) => {
      return state.backgroundMessageStore[payloadDigest]
    }
  }
}
