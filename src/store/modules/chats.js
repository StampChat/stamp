import assert from 'assert'
import Vue from 'vue'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../wallet/helpers'
import { desktopNotify } from '../../utils/notifications'

const defaultContactObject = { inputMessage: '', lastRead: null, stampAmount: defaultStampAmount, totalUnreadMessages: 0, totalUnreadValue: 0, totalValue: 0 }

function calculateUnreadAggregates (messages, lastReadTime) {
  const messageValues = messages
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

export function rehydateChat (chatState) {
  if (!chatState) {
    return
  }

  chatState.messages = chatState.messages || {}

  if (chatState.chats) {
    for (const contactAddress in chatState.chats) {
      const contact = chatState.chats[contactAddress]
      contact.address = contactAddress
      contact.messages = []
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
    chats: {},
    messages: {},
    lastReceived: null
  },
  getters: {
    getMessageByPayload: (state) => (index) => {
      if (!state.messages) {
        return null
      }
      return state.messages[index]
    },
    getNumUnread: (state) => (addr) => {
      return state.chats[addr] ? state.chats[addr].totalUnreadMessages : 0
    },
    getSortedChatOrder (state) {
      const sortedOrder = Object.values(state.chats).sort(
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
    lastRead: (state) => (addr) => {
      return addr in state.chats ? state.chats[addr].lastRead : 0
    },
    getStampAmount: (state) => (addr) => {
      return state.chats[addr].stampAmount || defaultStampAmount
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessage: (state) => (addr) => {
      const nMessages = Object.keys(state.chats[addr].messages).length
      if (nMessages === 0) {
        return null
      }

      const lastMessageKey = Object.keys(state.chats[addr].messages)[nMessages - 1]
      const lastMessage = state.chats[addr].messages[lastMessageKey]
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
    deleteMessage (state, { addr, index }) {
      state.chats[addr].messages.splice(index, 1)
    },
    readAll (state, addr) {
      const values = state.chats[addr].messages
      if (values.length === 0) {
        state.chats[addr].lastRead = null
      } else {
        state.chats[addr].lastRead = Math.max(values[values.length - 1].serverTime, state.chats[addr].lastRead)
      }
      state.chats[addr].totalUnreadMessages = 0
      state.chats[addr].totalUnreadValue = 0
    },
    reset (state) {
      state.order = []
      state.activeChatAddr = null
      state.chats = {}
      state.lastReceived = null
    },
    setActiveChat (state, addr) {
      if (!(addr in state.chats)) {
        Vue.set(state.chats, addr, { ...defaultContactObject, messages: [], address: addr })
      }
      state.activeChatAddr = addr
    },
    sendMessageLocal (state, { addr, senderAddress, index, items, outpoints = [], status = 'pending', retryData = null }) {
      const timestamp = Date.now()
      const newMsg = {
        outbound: true,
        status,
        items,
        serverTime: timestamp,
        receivedTime: timestamp,
        outpoints,
        retryData,
        senderAddress
      }
      assert(newMsg.outbound !== undefined)
      assert(newMsg.status !== undefined)
      assert(newMsg.receivedTime !== undefined)
      assert(newMsg.serverTime !== undefined)
      assert(newMsg.items !== undefined)
      assert(newMsg.outpoints !== undefined)
      assert(newMsg.senderAddress !== undefined, 'missing sender address')

      const message = { payloadDigest: index, ...newMsg }
      if (index in state.messages) {
        // we have the message already, just need to update some fields and return
        state.messages[index] = Object.assign(state.messages[index], message)
        return
      }

      state.messages[index] = message
      if (addr in state.chats) {
        state.chats[addr].messages.push(message)
        return
      }
      Vue.set(state.chats, addr, { ...defaultContactObject, messages: [message], address: addr })
    },
    clearChat (state, addr) {
      if (addr in state.chats) {
        state.chats[addr].messages = {}
      }
    },
    deleteChat (state, addr) {
      if (state.activeChatAddr === addr) {
        state.activeChatAddr = null
      }
      Vue.delete(state.chats, addr)
    },
    receiveMessage (state, { addr, index, newMsg }) {
      assert(newMsg.outbound !== undefined)
      assert(newMsg.status !== undefined)
      assert(newMsg.receivedTime !== undefined)
      assert(newMsg.serverTime !== undefined)
      assert(newMsg.items !== undefined)
      assert(newMsg.outpoints !== undefined)
      assert(newMsg.senderAddress !== undefined)

      const message = { payloadDigest: index, ...newMsg }
      if (index in state.messages) {
        // Mutate the object so that it striggers reactivity
        state.messages[index] = Object.assign(state.messages[index], message)
        // We should already have created the chat if we have the message
        return
      }
      // We don't need reactivity here
      state.messages[index] = message
      if (!(addr in state.chats)) {
        // We do need reactivity to create a new chat
        Vue.set(state.chats, addr, { ...defaultContactObject, messages: [], address: addr })
      }

      // TODO: Better indexing
      state.chats[addr].messages.push(message)
      state.chats[addr].lastReceived = message.serverTime
      const messageValue = stampPrice(message.outpoints) + message.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      if (addr !== state.activeChatAddr && state.chats[addr].lastRead < message.serverTime) {
        state.chats[addr].totalUnreadValue += messageValue
        state.chats[addr].totalUnreadMessages += 1
      }
      state.lastReceived = message.serverTime
      state.chats[addr].totalValue += messageValue
    },
    setStampAmount (state, { addr, stampAmount }) {
      state.chats[addr].stampAmount = stampAmount
    }
  },
  actions: {
    reset ({ commit }) {
      commit('reset')
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
    setStampAmount ({ commit }, { addr, stampAmount }) {
      assert(typeof stampAmount === 'number')
      commit('setStampAmount', { addr, stampAmount })
    },
    receiveMessage ({ dispatch, commit, rootGetters, getters }, { outbound, copartyAddress, copartyPubKey, index, newMsg }) {
      // Check whether contact exists
      if (!rootGetters['contacts/isContact'](copartyAddress)) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', { addr: copartyAddress, pubKey: copartyPubKey }, { root: true })

        // Load contact
        dispatch('contacts/refresh', copartyAddress, { root: true })
      }

      // Ignore messages below acceptance price
      const acceptancePrice = rootGetters['myProfile/getInbox'].acceptancePrice
      const lastRead = getters.lastRead(copartyAddress)

      const acceptable = (newMsg.stampValue >= acceptancePrice)
      // If not focused (and not outbox message) then notify
      if (!document.hasFocus() && !outbound && acceptable && lastRead < newMsg.serverTime) {
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
