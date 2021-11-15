import assert from 'assert'
import type { Module } from 'vuex'
import { indexBy, uniq } from 'ramda'

import { KeyserverHandler } from 'src/cashweb/keyserver/handler'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, keyservers } from '../../utils/constants'

import { ForumMessage, ForumMessageEntry } from 'src/cashweb/types/forum'
import { SortMode } from 'src/utils/sorting'

type MessageWithReplies = ForumMessage & { replies: MessageWithReplies[] }

export type State = {
  messages: MessageWithReplies[];
  index: Record<string, MessageWithReplies | undefined>
  topics: string[]
  selectedTopic: string,
  sortMode: SortMode,
  duration: number,
  voteThreshold: number,
  compactView: boolean,
};

const module: Module<State, unknown> = {
  namespaced: true,
  state: {
    messages: [],
    index: {},
    topics: [],
    selectedTopic: '',
    sortMode: 'hot',
    // 1 week
    duration: 1000 * 60 * 60 * 24 * 7,
    voteThreshold: 0,
    compactView: false
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
    },
    getSortMode (state) {
      return state.sortMode
    },
    getDuration (state) {
      return state.duration
    },
    getVoteThreshold (state) {
      return state.voteThreshold
    },
    getCompactView (state) {
      return state.compactView
    }
  },
  mutations: {
    setSortMode (state, sortMode) {
      state.sortMode = sortMode
    },
    setDuration (state, duration: number) {
      state.duration = duration
    },
    setVoteThreshold (state, voteThreshold: number) {
      state.voteThreshold = voteThreshold
    },
    setCompactView (state, compactView: boolean) {
      state.compactView = compactView
    },
    setEntries (state, messages: ForumMessage[]) {
      const newMessages = messages.filter((m) => !(m.payloadDigest in state.index)).map(m => ({ ...m, replies: [] }))
      state.messages.push(...newMessages.filter(m => !(m.payloadDigest in state.index)))
      state.index = indexBy(message => message.payloadDigest, state.messages)
      state.topics = uniq(messages.map(message => message.topic))
      for (const message of newMessages) {
        if (!message.parentDigest) {
          continue
        }
        if (!(message.parentDigest in state.index)) {
          continue
        }
        const replies = state.index[message.parentDigest]?.replies
        const found = replies?.some((reply) => reply.payloadDigest === message.payloadDigest)
        if (found) {
          return
        }
        state.index[message.parentDigest]?.replies.push(message)
      }
    },
    setMessage (state, message: ForumMessage) {
      if (message.payloadDigest in state.index) {
        const oldMessage = state.index[message.payloadDigest]
        assert(oldMessage, 'Not possible, typescript hole')
        oldMessage.satoshis = message.satoshis
        return
      }
      const containsPost = message.entries.some((entry) => entry.kind === 'post')
      if (!containsPost) {
        return
      }

      console.log('Saving specific message', message)
      const mesageWithReplies = { ...message, replies: [] }
      state.messages.push(mesageWithReplies)
      state.index = indexBy(message => message.payloadDigest, state.messages)
      state.topics = uniq(state.messages.map(message => message.topic))
      if (!mesageWithReplies.parentDigest) {
        return
      }
      if (!(mesageWithReplies.parentDigest in state.index)) {
        return
      }
      const replies = state.index[mesageWithReplies.parentDigest]?.replies
      const found = replies?.some((reply) => reply.payloadDigest === mesageWithReplies.payloadDigest)
      if (found) {
        return
      }
      state.index[mesageWithReplies.parentDigest]?.replies.push(mesageWithReplies)
    },
    setSelectedTopic (state, topic: string) {
      state.selectedTopic = topic
    },
    pushNewTopic (state, topic: string) {
      state.topics.push(topic)
    }
  },
  actions: {
    async refreshMessages ({ commit, getters }, { wallet }: { topic: string, wallet: Wallet }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      const from = Date.now() - getters.getDuration
      console.log(from)
      const entries = await keyserver.getBroadcastMessages('', from)
      if (!entries) {
        return
      }
      commit('setEntries', entries)
    },
    async putMessage ({ dispatch }, { wallet, entry, satoshis, topic, parentDigest }: { wallet: Wallet, entry: ForumMessageEntry, satoshis: number, topic: string, parentDigest?: string }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      const payloadDigest = await keyserver.createBroadcast(topic, [entry], satoshis, parentDigest)
      await dispatch('fetchMessage', { payloadDigest, wallet })
    },
    async fetchMessage ({ commit, getters }, { wallet, payloadDigest }: { wallet: Wallet, payloadDigest: string }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
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
      await dispatch('fetchMessage', { payloadDigest, wallet })
    }
  }
}

export default module
