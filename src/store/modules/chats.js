import Vue from 'vue'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../wallet/helpers'
import { desktopNotify } from '../../utils/notifications'

const defaultContactObject = { inputMessage: '', lastRead: null, stampAmount: defaultStampAmount, totalUnreadMessages: 0, totalUnreadValue: 0, totalValue: 0 }

function calculateUnreadAggregates (messages, lastReadTime) {
  const messageValues = Object.values(messages)
    .filter(message => !message.outbound)
    .map((message) => {
      return {
        read: lastReadTime < message.serverTime,
        totalValue: (stampPrice(message.outpoints) || 0) + message.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      }
    })
  const unreadMessageValues = messageValues.filter((message) => !message.read)
  const totalUnreadValue = unreadMessageValues.reduce((totalValue, message) => totalValue + message.totalValue, 0)
  const totalValue = messageValues.reduce((totalValue, message) => totalValue + message.totalValue, 0)
  return {
    totalUnreadValue,
    totalUnreadMessages: unreadMessageValues.length,
    totalValue
  }
}

export function rehydateChat (chats) {
  if (!chats) {
    return
  }

  chats.messages = chats.messages || {}

  if (chats.data) {
    for (const contactAddress in chats.data) {
      const contact = chats.data[contactAddress]
      contact.address = contactAddress
      if (contact.messsages) {
        delete contact.messsages
        contact.messages = {}
      }
      // This person has saved data, no need to migrate
      if (contact.totalValue === undefined) {
        const { totalUnreadMessages, totalUnreadValue, totalValue } = calculateUnreadAggregates(contact.messages, contact.lastRead)
        contact.totalUnreadMessages = totalUnreadMessages
        contact.totalUnreadValue = totalUnreadValue
        contact.totalValue = totalValue
      }
    }
  }
}

export default {
  namespaced: true,
  state: {
    activeChatAddr: null,
    data: {},
    messages: {},
    lastReceived: null
  },
  getters: {
    getMessage: (state) => (addr, index) => {
      return state.data[addr].messages[index]
    },
    getMessageByPayload: (state) => (index) => {
      if (!state.messages) {
        return null
      }
      return state.messages[index]
    },
    getNumUnread: (state) => (addr) => {
      return state.data[addr] ? state.data[addr].totalUnreadMessages : 0
    },
    getSortedChatOrder (state) {
      const sortedOrder = Object.values(state.data).sort(
        (contactA, contactB) => {
          if (contactB.totalUnreadValue - contactA.totalUnreadValue !== 0) {
            return contactB.totalUnreadValue - contactA.totalUnreadValue
          }

          if (contactB.totalValue - contactA.totalValue !== 0) {
            return contactB.totalValue - contactA.totalValue
          }

          if (contactB.lastRead - contactA.lastRead !== 0) {
            return contactB.lastRead - contactA.lastRead
          }

          if (contactB.totalUnreadMessages - contactA.totalUnreadMessages !== 0) {
            return contactB.totalUnreadMessages - contactA.totalUnreadMessages
          }

          // No other tiebreakers
          return 0
        }
      )
      return sortedOrder
    },
    getStampAmount: (state) => (addr) => {
      return state.data[addr].stampAmount || defaultStampAmount
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessage: (state) => (addr) => {
      const nMessages = Object.keys(state.data[addr].messages).length
      if (nMessages === 0) {
        return null
      }

      const lastMessageKey = Object.keys(state.data[addr].messages)[nMessages - 1]
      const lastMessage = state.data[addr].messages[lastMessageKey]
      const items = lastMessage.items
      const lastItem = items[items.length - 1]

      if (lastItem.type === 'text') {
        const info = {
          outbound: lastMessage.outbound,
          text: lastItem.text
        }
        return info
      }

      if (lastItem.type === 'image') {
        const info = {
          outbound: lastMessage.outbound,
          text: 'Sent image'
        }
        return info
      }

      if (lastItem.type === 'stealth') {
        const info = {
          outbound: lastMessage.outbound,
          text: 'Sent Bitcoin'
        }
        return info
      }
    },
    getLastReceived (state) {
      return state.lastReceived
    }
  },
  mutations: {
    deleteMessage (state, { addr, id }) {
      Vue.delete(state.data[addr].messages, id)
    },
    reset (state) {
      state.order = []
      state.activeChatAddr = null
      state.data = {}
      state.lastReceived = null
    },
    readAll (state, addr) {
      const values = Object.values(state.data[addr].messages)

      if (values.length === 0) {
        state.data[addr].lastRead = null
      } else {
        state.data[addr].lastRead = values[values.length - 1].serverTime
      }
      state.data[addr].totalUnreadMessages = 0
      state.data[addr].totalUnreadValue = 0
    },
    setActiveChat (state, addr) {
      if (!(addr in state.data)) {
        Vue.set(state.data, addr, { ...defaultContactObject, messages: {}, address: addr })
      }
      state.activeChatAddr = addr
    },
    sendMessageLocal (state, { addr, index, items, outpoints = [], status = 'pending', retryData = null }) {
      const timestamp = Date.now()
      const newMsg = {
        outbound: true,
        status,
        items,
        timestamp,
        outpoints,
        retryData
      }
      state.messages[index] = newMsg
      if (addr in state.data) {
        Vue.set(state.data[addr].messages, index, newMsg)
        return
      }
      // Handle default case
      const messages = {
        index: newMsg
      }
      Vue.set(state.data, addr, { ...defaultContactObject, messages, address: addr })
    },
    clearChat (state, addr) {
      if (addr in state.data) {
        state.data[addr].messages = {}
      }
    },
    deleteChat (state, addr) {
      if (state.activeChatAddr === addr) {
        state.activeChatAddr = null
      }
      Vue.delete(state.data, addr)
    },
    receiveMessage (state, { addr, index, newMsg }) {
      if (!(addr in state.data)) {
        const messages = {}
        // TODO: Better indexing
        messages[index] = newMsg
        Vue.set(state.data, addr, { ...defaultContactObject, messages, address: addr })
      } else {
        // TODO: Better indexing
        Vue.set(state.data[addr].messages, index, newMsg)
      }
      state.messages[index] = newMsg
      state.data[addr].lastReceived = newMsg.serverTime
      const messageValue = stampPrice(newMsg.outpoints) + newMsg.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      if (addr !== state.activeChatAddr && state.data[addr].lastRead < newMsg.serverTime) {
        state.data[addr].totalUnreadValue += messageValue
        state.data[addr].totalUnreadMessages += 1
      }
      state.lastReceived = newMsg.serverTime
      state.data[addr].totalValue += messageValue
    },
    setStampAmount (state, { addr, stampAmount }) {
      state.data[addr].stampAmount = stampAmount
    }
  },
  actions: {
    deleteMessage ({ commit }, { addr, id }) {
      commit('deleteMessage', { addr, id })
    },
    reset ({ commit }) {
      commit('reset')
    },
    readAll ({ commit }, addr) {
      commit('readAll', addr)
    },
    shareContact ({ commit, rootGetters, dispatch }, { currentAddr, shareAddr }) {
      const contact = rootGetters['contacts/getContactProfile'](currentAddr)
      const text = 'Name: ' + contact.name + '\n' + 'Address: ' + currentAddr
      commit('setInputMessage', { addr: shareAddr, text })
      dispatch('setActiveChat', shareAddr)
    },
    setActiveChat ({ commit, dispatch }, addr) {
      dispatch('contacts/refresh', addr, { root: true })
      commit('setActiveChat', addr)
      commit('readAll', addr)
    },
    startChatUpdater ({ dispatch }) {
      setInterval(() => { dispatch('refresh') }, 1_000)
    },
    clearChat ({ commit }, addr) {
      commit('clearChat', addr)
    },
    deleteChat ({ commit }, addr) {
      commit('deleteChat', addr)
    },
    setStampAmount ({ commit }, { addr, stampAmount }) {
      commit('setStampAmount', { addr, stampAmount })
    },
    async receiveMessage ({ dispatch, commit, rootGetters }, { outbound, copartyAddress, copartyPubKey, index, newMsg }) {
      // Check whether contact exists
      if (!rootGetters['contacts/isContact'](copartyAddress)) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', { addr: copartyAddress, pubKey: copartyPubKey }, { root: true })

        // Load contact
        dispatch('contacts/refresh', copartyAddress, { root: true })
      }

      // Ignore messages below acceptance price
      const acceptancePrice = rootGetters['myProfile/getInbox'].acceptancePrice
      const acceptable = (newMsg.stampValue >= acceptancePrice)
      // If not focused (and not outbox message) then notify
      if (!document.hasFocus() && !outbound && acceptable) {
        const contact = rootGetters['contacts/getContact'](copartyAddress)
        const textItem = newMsg.items.find(item => item.type === 'text') || { text: '' }
        if (contact.notify) {
          desktopNotify(contact.profile.name, textItem.text, contact.profile.avatar, () => {
            dispatch('setActiveChat', copartyAddress)
          })
        }
      }
      commit('receiveMessage', { addr: copartyAddress, index, newMsg })
    }
  }
}
