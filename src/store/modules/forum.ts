import type { Module } from 'vuex'
import { indexBy, uniq } from 'ramda'

import { KeyserverHandler } from 'src/cashweb/keyserver/handler'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, keyservers } from '../../utils/constants'

import { ForumMessage, ForumMessageEntry } from 'src/cashweb/types/forum'

type MessageWithReplies = ForumMessage & { replies: MessageWithReplies[] }

export type State = {
  messages: MessageWithReplies[];
  index: Record<string, MessageWithReplies | undefined>
  topics: string[]
  selectedTopic: string,
};

const halfLife = (satoshis: number, timestamp: Date, now: Date) => {
  const halvedAmount = satoshis * Math.pow(0.5, (now.valueOf() - timestamp.valueOf()) / (60 * 60 * 24 * 1000))
  return halvedAmount
}

const module: Module<State, unknown> = {
  namespaced: true,
  state: {
    messages: [],
    index: {},
    topics: [],
    selectedTopic: ''
  },
  getters: {
    getMessages (state) {
      return state.messages
    },
    getTopics (state) {
      return state.topics
    },
    getSelectedTopic (state) {
      return state.selectedTopic
    },
    getMessage (state) {
      return (messageDigest?: string) => {
        console.log('messageDigest', messageDigest)
        if (!messageDigest) {
          return null
        }
        return state.index[messageDigest]
      }
    },
    lastMessageTime (state) {
      return state.messages.reduce((maxDate, message) => (!maxDate || maxDate < message.timestamp) ? message.timestamp : maxDate, undefined as Date | undefined)
    }
  },
  mutations: {
    setEntries (state, messages: ForumMessage[]) {
      const newMessages = messages.filter((m) => !(m.payloadDigest in state.index)).map(m => ({ ...m, replies: [] }))
      const allMessages = state.messages.slice()
      const index = indexBy(message => message.payloadDigest, allMessages)
      allMessages.push(...newMessages.filter(m => !(m.payloadDigest in index)))

      const now = new Date()
      allMessages.sort((a, b) => halfLife(b.satoshis, b.timestamp, now) - halfLife(a.satoshis, a.timestamp, now))
      state.index = indexBy(message => message.payloadDigest, state.messages)
      state.topics = uniq(messages.map(message => message.topic))
      for (const message of newMessages) {
        if (!message.parentDigest) {
          continue
        }
        if (!(message.parentDigest in state.index)) {
          continue
        }
        state.index[message.parentDigest]?.replies.push(message)
      }
      state.messages = allMessages
    },
    setMessage (state, message: ForumMessage) {
      if (message.payloadDigest in state.index) {
        return
      }
      const now = new Date()
      console.log('Saving specific message', message)
      const allMessages = state.messages.slice()
      const mesageWithReplies = { ...message, replies: [] }
      allMessages.push(mesageWithReplies)
      state.messages.sort((a, b) => halfLife(b.satoshis, b.timestamp, now) - halfLife(a.satoshis, a.timestamp, now))
      state.index = indexBy(message => message.payloadDigest, state.messages)
      state.topics = uniq(allMessages.map(message => message.topic))
      if (!mesageWithReplies.parentDigest) {
        return
      }
      if (!(mesageWithReplies.parentDigest in state.index)) {
        return
      }
      state.index[mesageWithReplies.parentDigest]?.replies.push(mesageWithReplies)
      state.messages = allMessages
    },
    setSelectedTopic (state, topic: string) {
      state.selectedTopic = topic
    }
  },
  actions: {
    async refreshMessages ({ commit, getters }, { wallet }: { topic: string, wallet: Wallet }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      const from = (getters.lastMessageTime as (undefined | Date))?.valueOf()
      console.log('from', from)
      const entries = await keyserver.getBroadcastMessages('', from)
      if (!entries) {
        return
      }
      commit('setEntries', entries)
    },
    async putMessage ({ dispatch }, { wallet, entry, satoshis, topic, parentDigest }: { wallet: Wallet, entry: ForumMessageEntry, satoshis: number, topic: string, parentDigest?: string }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      await keyserver.createBroadcast(topic, [entry], satoshis, parentDigest)
      await dispatch('refreshMessages', { wallet })
    },
    async fetchMessage ({ commit, getters }, { wallet, payloadDigest }: { wallet: Wallet, payloadDigest: string }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      const haveMessage = getters.getMessage(payloadDigest)
      if (haveMessage) {
        return haveMessage
      }
      console.log('fetching message', payloadDigest)
      const message = await keyserver.getBroadcastMessage(payloadDigest)
      commit('setMessage', message)
      // Need to refetch so we get the right proxy object
      return getters.getMessage(payloadDigest)
    },
    async addOffering ({ dispatch }, { wallet, payloadDigest, satoshis }: { wallet: Wallet, payloadDigest: string, satoshis: number }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('voting towards message', payloadDigest, satoshis)
      await keyserver.addOfferings(payloadDigest, satoshis)
      await dispatch('refreshMessages', { wallet })
    }
  }
}

export default module
