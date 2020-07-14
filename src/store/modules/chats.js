import assert from 'assert'
import Vue from 'vue'
import { defaultStampAmount } from '../../utils/constants'
import { stampPrice } from '../../wallet/helpers'
import { desktopNotify } from '../../utils/notifications'
import { store } from '../../adapters/level-message-store'

const defaultContactObject = { inputMessage: '', lastRead: null, stampAmount: defaultStampAmount, totalUnreadMessages: 0, totalUnreadValue: 0, totalValue: 0 }

const defaultChats = [
  {
    inputMessage: '',
    lastRead: null,
    stampAmount: 50000,
    totalUnreadMessages: 0,
    totalUnreadValue: 0,
    totalValue: 0,
    messages: {},
    address: 'bchtest:qrugj9hv6lcar6hflk26yz8k9qq8wp9tvsmvvqqwgq',
    lastReceived: null
  },
  {
    inputMessage: '',
    lastRead: null,
    stampAmount: 5000,
    totalUnreadMessages: 0,
    totalUnreadValue: 0,
    totalValue: 0,
    messages: {},
    address: 'bchtest:qq3q7kzdds2xuzug05tn7w3lp7kkfulqfsf85x8tty',
    lastReceived: null
  },
  {
    inputMessage: '',
    lastRead: null,
    stampAmount: 5000,
    totalUnreadMessages: 0,
    totalUnreadValue: 0,
    totalValue: 0,
    messages: {},
    address: 'bchtest:qqu3vqt9hydcmhkydn9h68qzlyduypuwqgnc8vvjhc',
    lastReceived: null
  }
]

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

export async function rehydateChat (chatState) {
  if (!chatState) {
    return
  }

  chatState.messages = chatState.messages || {}

  if (chatState.chats) {
    for (const chat of defaultChats) {
      if (!(chat.address in chatState.chats)) {
        chatState.chats[chat.address] = chat
      }
    }

    for (const contactAddress in chatState.chats) {
      const contact = chatState.chats[contactAddress]
      contact.address = contactAddress
      contact.messages = []
      if (contact.messsages) {
        delete contact.messsages
        contact.messages = []
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

  const messageIterator = await store.getIterator()
  // Todo, this rehydrate stuff is common to receiveMessage
  for await (const messageWrapper of messageIterator) {
    if (!messageWrapper.newMsg) {
      continue
    }
    const { index, newMsg, copartyAddress } = messageWrapper
    assert(newMsg.outbound !== undefined)
    assert(newMsg.status !== undefined)
    assert(newMsg.receivedTime !== undefined)
    assert(newMsg.serverTime !== undefined)
    assert(newMsg.items !== undefined)
    assert(newMsg.outpoints !== undefined)
    assert(newMsg.senderAddress !== undefined)

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
    if (copartyAddress !== chatState.activeChatAddr && chatState.chats[copartyAddress].lastRead < message.serverTime) {
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
      return state.chats[address] ? state.chats[address].totalUnreadMessages : 0
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
      return address in state.chats ? state.chats[address].lastRead : 0
    },
    getStampAmount: (state) => (address) => {
      return state.chats[address].stampAmount || defaultStampAmount
    },
    getActiveChat (state) {
      return state.activeChatAddr
    },
    getLatestMessage: (state) => (address) => {
      const nMessages = Object.keys(state.chats[address].messages).length
      if (nMessages === 0) {
        return null
      }

      const lastMessageKey = Object.keys(state.chats[address].messages)[nMessages - 1]
      const lastMessage = state.chats[address].messages[lastMessageKey]
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
    deleteMessage (state, { address, index }) {
      state.chats[address].messages.splice(index, 1)
    },
    readAll (state, address) {
      const values = state.chats[address].messages
      if (values.length === 0) {
        state.chats[address].lastRead = null
      } else {
        state.chats[address].lastRead = Math.max(values[values.length - 1].serverTime, state.chats[address].lastRead)
      }
      state.chats[address].totalUnreadMessages = 0
      state.chats[address].totalUnreadValue = 0
    },
    reset (state) {
      state.order = []
      state.activeChatAddr = null
      state.chats = {}
      state.lastReceived = null
    },
    setActiveChat (state, address) {
      if (!(address in state.chats)) {
        Vue.set(state.chats, address, { ...defaultContactObject, messages: [], address })
      }
      state.activeChatAddr = address
    },
    sendMessageLocal (state, { address, senderAddress, index, items, outpoints = [], status = 'pending', retryData = null }) {
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
      if (address in state.chats) {
        state.chats[address].messages.push(message)
        state.chats[address].lastRead = Date.now()
        return
      }
      Vue.set(state.chats, address, { ...defaultContactObject, messages: [message], address })
    },
    clearChat (state, address) {
      if (address in state.chats) {
        state.chats[address].messages = []
      }
    },
    deleteChat (state, address) {
      if (state.activeChatAddr === address) {
        state.activeChatAddr = null
      }
      Vue.delete(state.chats, address)
    },
    receiveMessage (state, { address, index, newMsg }) {
      assert(newMsg.outbound !== undefined)
      assert(newMsg.status !== undefined)
      assert(newMsg.receivedTime !== undefined)
      assert(newMsg.serverTime !== undefined)
      assert(newMsg.items !== undefined)
      assert(newMsg.outpoints !== undefined)
      assert(newMsg.senderAddress !== undefined)
      assert(address !== undefined)
      assert(index !== undefined)

      const message = { payloadDigest: index, ...newMsg }
      if (index in state.messages) {
        // Mutate the object so that it striggers reactivity
        state.messages[index] = Object.assign(state.messages[index], message)
        // We should already have created the chat if we have the message
        return
      }
      // We don't need reactivity here
      state.messages[index] = message
      if (!(address in state.chats)) {
        // We do need reactivity to create a new chat
        Vue.set(state.chats, address, { ...defaultContactObject, messages: [], address })
      }

      // TODO: Better indexing
      state.chats[address].messages.push(message)
      state.chats[address].lastReceived = message.serverTime
      const messageValue = stampPrice(message.outpoints) + message.items.reduce((totalValue, { amount = 0 }) => totalValue + amount, 0)
      if (address !== state.activeChatAddr && state.chats[address].lastRead < message.serverTime) {
        state.chats[address].totalUnreadValue += messageValue
        state.chats[address].totalUnreadMessages += 1
      }
      state.lastReceived = message.serverTime
      state.chats[address].totalValue += messageValue
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
    startChatUpdater ({ dispatch }) {
      setInterval(() => { dispatch('refresh') }, 1_000)
    },
    setStampAmount ({ commit }, { address, stampAmount }) {
      assert(typeof stampAmount === 'number')
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
      // If not focused (and not outbox message) then notify
      if (!document.hasFocus() && !outbound && acceptable && lastRead < newMsg.serverTime) {
        const contact = rootGetters['contacts/getContact'](copartyAddress)
        const textItem = newMsg.items.find(item => item.type === 'text') || { text: '' }
        if (contact && contact.notify) {
          desktopNotify(contact.profile.name, textItem.text, contact.profile.avatar, () => {
            dispatch('setActiveChat', copartyAddress)
          })
        }
      }
      commit('receiveMessage', { address: copartyAddress, index, newMsg })
    }
  }
}
