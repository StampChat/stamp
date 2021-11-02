import type { Module } from 'vuex'
import { indexBy, uniq } from 'ramda'

import { KeyserverHandler } from 'src/cashweb/keyserver/handler'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, keyservers } from '../../utils/constants'

import { AgoraMessage, AgoraMessageEntry } from 'src/cashweb/types/agora'

type MessageWithReplies = AgoraMessage & { replies: MessageWithReplies[] }

export type State = {
  messages: MessageWithReplies[];
  index: Record<string, MessageWithReplies | undefined>
  topics: string[]
  selectedTopic: string,
};

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
    setEntries (state, messages: AgoraMessage[]) {
      const newMessages = messages.filter((m) => !(m.payloadDigest in state.index)).map(m => ({ ...m, replies: [] }))
      state.messages.push(...newMessages)
      state.messages.sort((a, b) => b.satoshis - a.satoshis).map(m => ({ ...m }))
      state.index = indexBy(message => message.payloadDigest, state.messages)
      state.topics = uniq(messages.map(message => message.topic))
      for (const message of state.messages) {
        console.log('message', message)
        if (!message.parentDigest) {
          continue
        }
        if (!(message.parentDigest in state.index)) {
          continue
        }
        state.index[message.parentDigest]?.replies.push(message)
      }
    },
    setMessage (state, message: AgoraMessage) {
      if (message.payloadDigest in state.index) {
        return
      }
      console.log('Saving specific message', message)
      const mesageWithReplies = { ...message, replies: [] }
      state.messages.push(mesageWithReplies)
      state.messages = state.messages.sort((a, b) => b.satoshis - a.satoshis)
      state.index[mesageWithReplies.payloadDigest] = mesageWithReplies
      state.topics = uniq(state.messages.map(message => message.topic))
      if (!mesageWithReplies.parentDigest) {
        return
      }
      if (!(mesageWithReplies.parentDigest in state.index)) {
        return
      }
      state.index[mesageWithReplies.parentDigest]?.replies.push(mesageWithReplies)
    },
    setSelectedTopic (state, topic: string) {
      state.selectedTopic = topic
    }
  },
  actions: {
    async refreshMessages ({ commit, getters }, { topic, wallet }: { topic: string, wallet: Wallet }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      const from = (getters.lastMessageTime as (undefined | Date))?.valueOf()
      console.log('from', from)
      const entries = await keyserver.getBroadcastMessages(topic, from)
      if (!entries) {
        return
      }
      console.log('saving messages', entries)
      commit('setEntries', entries)
    },
    async putMessage ({ dispatch, getters }, { wallet, entry, satoshis, topic, parentDigest }: { wallet: Wallet, entry: AgoraMessageEntry, satoshis: number, topic: string, parentDigest?: string }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      await keyserver.createBroadcast(topic, [entry], satoshis, parentDigest)
      await dispatch('refreshMessages', { wallet, topic: getters.getSelectedTopic })
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
    async addOffering ({ dispatch, getters }, { wallet, payloadDigest, satoshis }: { wallet: Wallet, payloadDigest: string, satoshis: number }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('voting towards message', payloadDigest, satoshis)
      await keyserver.addOfferings(payloadDigest, satoshis)
      await dispatch('refreshMessages', { wallet, topic: getters.getSelectedTopic })
    }
  }
}

export default module
