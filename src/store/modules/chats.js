import { Plugins } from '@capacitor/core'
import assert from 'assert'
import Vue from 'vue'
import { Platform } from 'quasar'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../wallet/helpers'
import { desktopNotify, mobileNotify } from '../../utils/notifications'
import { store } from '../../adapters/level-message-store'
import { toAPIAddress } from '../../utils/address'

const { App } = Plugins

const defaultContactObject = {
  inputMessage: '',
  lastRead: null,
  stampAmount: defaultStampAmount,
  totalUnreadMessages: 0,
  totalUnreadValue: 0,
  totalValue: 0
}

export async function rehydateChat (chatState) {
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
        contact.messages = []
      }
      contact.totalUnreadMessages = 0
      contact.totalUnreadValue = 0
      contact.totalValue = 0
    }
  }
  const localStore = await store

  const messageIterator = await localStore.getIterator()
  // Todo, this rehydrate stuff is common to receiveMessage
  for await (const messageWrapper of messageIterator) {
    if (!messageWrapper.newMsg) {
      continue
    }
    const { index, newMsg, copartyAddress } = messageWrapper
    assert(newMsg.outbound !== undefined, 'outbound is not defined')
    assert(newMsg.status !== undefined, 'status is not defined')
    assert(newMsg.receivedTime !== undefined, 'receivedTime is not defined')
    assert(newMsg.serverTime !== undefined, 'serverTime is not defined')
    assert(newMsg.items !== undefined, 'items is not defined')
    assert(newMsg.outpoints !== undefined, 'outpoints is not defined')
    assert(newMsg.senderAddress !== undefined, 'senderAddress is not defined')

    const message = { payloadDigest: index, ...newMsg }
    if (!chatState.messages) {
      chatState.messages = {}
    }
    if (!chatState.chats[copartyAddress]) {
      chatState.chats[copartyAddress] = { ...defaultContactObject, messages: [], copartyAddress }
    }
    chatState.messages[index] = message
    chatState.chats[copartyAddress].messages.push(message)
    chatState.chats[copartyAddress].lastReceived = message.serverTime
    const messageValue = stampPrice(message.outpoints) + message.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
    if (!newMsg.outbound && chatState.chats[copartyAddress].lastRead < message.serverTime) {
      chatState.chats[copartyAddress].totalUnreadValue += messageValue
      chatState.chats[copartyAddress].totalUnreadMessages += 1
    }
    chatState.lastReceived = message.serverTime
    chatState.chats[copartyAddress].totalValue += messageValue
  }

  // Resort chats
  for (const contactAddress in chatState.chats) {
    chatState.chats[contactAddress].messages.sort((messageA, messageB) => messageA.serverTime - messageB.serverTime)
  }
}

export default {
  namespaced: true,
  state: {
    activeChatAddr: null,
    chats: {
    },
    messages: {},
    lastReceived: null
  },
  getters: {
    getMessageByPayload: (state) => (payloadDigest) => {
      if (!state.messages) {
        return null
      }
      return state.messages[payloadDigest]
    },
    getNumUnread: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return state.chats[apiAddress] ? state.chats[apiAddress].totalUnreadMessages : 0
    },
    totalUnread (state) {
      return Object.values(state.chats).map((chat) => chat.totalUnreadMessages).reduce((acc, val) => acc + val, 0)
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
    lastRead: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return apiAddress in state.chats ? state.chats[apiAddress].lastRead : 0
    },
    getStampAmount: (state) => (address) => {
      const apiAddress = toAPIAddress(address)

      return state.chats[apiAddress].stampAmount || defaultStampAmount
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessage: (state) => (address) => {
      const apiAddress = toAPIAddress(address)
      const nopInfo = {
        outbound: false,
        text: ''
      }
      const nMessages = Object.keys(state.chats[apiAddress].messages).length
      if (nMessages === 0) {
        return nopInfo
      }

      const lastMessageKey = Object.keys(state.chats[apiAddress].messages)[nMessages - 1]
      const lastMessage = state.chats[apiAddress].messages[lastMessageKey]
      const items = lastMessage.items
      const lastItem = items[items.length - 1]

      if (!lastItem) {
        console.error(apiAddress)
        return null
      }
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
          text: 'Sent eCash'
        }
        return info
      }

      return nopInfo
    },
    getLastReceived (state) {
      return state.lastReceived
    }
  },
  mutations: {
    deleteMessage (state, { address, index }) {
      const apiAddress = toAPIAddress(address)

      state.chats[apiAddress].messages.splice(index, 1)
    },
    readAll (state, address) {
      const apiAddress = toAPIAddress(address)

      const values = state.chats[apiAddress].messages
      if (values.length === 0) {
        state.chats[apiAddress].lastRead = null
      } else {
        state.chats[apiAddress].lastRead = Math.max(values[values.length - 1].serverTime, state.chats[apiAddress].lastRead)
      }
      state.chats[apiAddress].totalUnreadMessages = 0
      state.chats[apiAddress].totalUnreadValue = 0
    },
    reset (state) {
      state.order = []
      state.activeChatAddr = null
      state.chats = {}
      state.lastReceived = null
    },
    openChat (state, address) {
      const apiAddress = toAPIAddress(address)

      if (!(apiAddress in state.chats)) {
        Vue.set(state.chats, apiAddress, { ...defaultContactObject, messages: [], address: apiAddress })
      }
    },
    setActiveChat (state, address) {
      if (!address) {
        state.activeChatAddr = null
        return
      }
      const apiAddress = toAPIAddress(address)

      if (!(apiAddress in state.chats)) {
        Vue.set(state.chats, apiAddress, { ...defaultContactObject, messages: [], address: apiAddress })
      }
      state.activeChatAddr = address
    },
    sendMessageLocal (state, { address, senderAddress, index, items, outpoints = [], status = 'pending', previousHash = null }) {
      const apiAddress = toAPIAddress(address)

      const timestamp = Date.now()
      const newMsg = {
        outbound: true,
        status,
        items,
        serverTime: timestamp,
        receivedTime: timestamp,
        outpoints,
        senderAddress,
        messageHash: index
      }
      assert(newMsg.outbound !== undefined, 'outbound is not defined')
      assert(newMsg.status !== undefined, 'status is not defined')
      assert(newMsg.receivedTime !== undefined, 'receivedTime is not defined')
      assert(newMsg.serverTime !== undefined, 'serverTime is not defined')
      assert(newMsg.items !== undefined, 'items is not defined')
      assert(newMsg.outpoints !== undefined, 'outpoints is not defined')
      assert(newMsg.senderAddress !== undefined, 'senderAddress is not defined')

      const message = { payloadDigest: index, ...newMsg }
      if (index in state.messages) {
        // we have the message already, just need to update some fields and return
        state.messages[index] = Object.assign(state.messages[index], message)
        return
      }

      if (previousHash in state.messages) {
        // we have the message already, just need to update some fields and return
        const msgIndex = state.chats[apiAddress].messages.findIndex((msg) => msg.messageHash === previousHash)
        state.chats[apiAddress].messages.splice(msgIndex, 1)
        delete state.messages[index]
        return
      }

      state.messages[index] = message
      if (apiAddress in state.chats) {
        state.chats[apiAddress].messages.push(message)
        state.chats[apiAddress].lastRead = Date.now()
        return
      }
      Vue.set(state.chats, apiAddress, { ...defaultContactObject, messages: [message], address: apiAddress })
    },
    clearChat (state, address) {
      const apiAddress = toAPIAddress(address)

      if (apiAddress in state.chats) {
        state.chats[apiAddress].messages = []
      }
    },
    deleteChat (state, address) {
      const apiAddress = toAPIAddress(address)

      if (state.activeChatAddr === apiAddress) {
        state.activeChatAddr = null
      }
      Vue.delete(state.chats, apiAddress)
    },
    receiveMessage (state, { address, index, newMsg }) {
      const apiAddress = toAPIAddress(address)

      assert(newMsg.outbound !== undefined, 'outbound is not defined')
      assert(newMsg.status !== undefined, 'status is not defined')
      assert(newMsg.receivedTime !== undefined, 'receivedTime is not defined')
      assert(newMsg.serverTime !== undefined, 'serverTime is not defined')
      assert(newMsg.items !== undefined, 'items is not defined')
      assert(newMsg.outpoints !== undefined, 'outpoints is not defined')
      assert(newMsg.senderAddress !== undefined, 'senderAddress is not defined')
      assert(address !== undefined, 'address is not defined')
      assert(index !== undefined, 'index is not defined')

      const message = { payloadDigest: index, ...newMsg }
      if (index in state.messages) {
        // Mutate the object so that it striggers reactivity
        state.messages[index] = Object.assign(state.messages[index], message)
        // We should already have created the chat if we have the message
        return
      }
      // We don't need reactivity here
      state.messages[index] = message
      if (!(apiAddress in state.chats)) {
        // We do need reactivity to create a new chat
        Vue.set(state.chats, apiAddress, { ...defaultContactObject, messages: [], address: apiAddress })
      }

      // TODO: Better indexing
      state.chats[apiAddress].messages.push(message)
      state.chats[apiAddress].lastReceived = message.serverTime
      const messageValue = stampPrice(message.outpoints) + message.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      if (apiAddress !== state.activeChatAddr && state.chats[apiAddress].lastRead < message.serverTime) {
        state.chats[apiAddress].totalUnreadValue += messageValue
        state.chats[apiAddress].totalUnreadMessages += 1
      }
      state.lastReceived = message.serverTime
      state.chats[apiAddress].totalValue += messageValue
    },
    setStampAmount (state, { address, stampAmount }) {
      state.chats[address].stampAmount = stampAmount
    }
  },
  actions: {
    reset ({ commit }) {
      commit('reset')
    },
    readAll (state, address) {
      const values = Object.values(state.data[address].messages)
      if (values.length === 0) {
        state.data[address].lastRead = null
      } else {
        state.data[address].lastRead = values[values.length - 1].serverTime
      }
      state.data[address].totalUnreadMessages = 0
      state.data[address].totalUnreadValue = 0
    },
    shareContact ({ commit, rootGetters, dispatch }, { currentAddr, shareAddr }) {
      const contact = rootGetters['contacts/getContactProfile'](currentAddr)
      const text = 'Name: ' + contact.name + '\n' + 'Address: ' + currentAddr
      commit('setInputMessage', { address: shareAddr, text })
      dispatch('setActiveChat', shareAddr)
    },
    setActiveChat ({ commit, dispatch }, address) {
      dispatch('contacts/refresh', address, { root: true })
      commit('setActiveChat', address)
      commit('readAll', address)
    },
    setStampAmount ({ commit }, { address, stampAmount }) {
      assert(typeof stampAmount === 'number', 'stampAmount wrong type')
      commit('setStampAmount', { address, stampAmount })
    },
    receiveMessage ({ dispatch, commit, rootGetters, getters }, { outbound, copartyAddress, copartyPubKey, index, newMsg }) {
      // Check whether contact exists
      if (!rootGetters['contacts/isContact'](copartyAddress)) {
        // Add dummy contact
        dispatch('contacts/addLoadingContact', { address: copartyAddress, pubKey: copartyPubKey }, { root: true })

        // Load contact
        dispatch('contacts/refresh', copartyAddress, { root: true })
      }

      // Ignore messages below acceptance price
      const acceptancePrice = rootGetters['myProfile/getInbox'].acceptancePrice
      const lastRead = getters.lastRead(copartyAddress)

      const acceptable = (newMsg.stampValue >= acceptancePrice)
      // If not focused/active (and not outbox message) then notify
      if (!outbound && acceptable && lastRead < newMsg.serverTime) {
        const contact = rootGetters['contacts/getContact'](copartyAddress)
        const textItem = newMsg.items.find(item => item.type === 'text') || { text: '' }

        if (contact && contact.notify) {
          if (!document.hasFocus() && Platform.is.desktop) {
            desktopNotify(contact.profile.name, textItem.text, contact.profile.avatar, () => {
              dispatch('setActiveChat', copartyAddress)
            })
          }
          if (Platform.is.mobile) {
            App.getState().then(({ isActive }) => {
              if (!isActive) {
                mobileNotify(contact.profile.name, textItem.text)
              }
            })
          }
        }
      }
      commit('receiveMessage', { address: copartyAddress, index, newMsg })
    },
    hasNewMessages () {
      // Notify that we have new messages, but only for mobile in case the app not active
      if (Platform.is.mobile) {
        App.getState().then(({ isActive }) => {
          if (!isActive) {
            console.log('mobile Notify: ' + isActive)
            mobileNotify('New Messages', 'You have new messages. Please check your stamp for new messages.')
          }
        })
      }
    }
  }
}
