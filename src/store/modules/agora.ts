import type { Module } from 'vuex'
import { indexBy, uniq } from 'ramda'

import { KeyserverHandler } from 'src/cashweb/keyserver/handler'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, keyservers } from '../../utils/constants'

import { AgoraMessage, AgoraMessageEntry } from 'src/cashweb/types/agora'

export type State = {
  messages: AgoraMessage[];
  index: Record<string, AgoraMessage | undefined>
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
    }
  },
  mutations: {
    setEntries (state, messages: AgoraMessage[]) {
      messages.sort((a, b) => b.satoshis - a.satoshis)
      state.messages = messages
      state.index = indexBy(message => message.payloadHash, messages)
      state.topics = uniq(messages.map(message => message.topic))
    },
    setSelectedTopic (state, topic: string) {
      state.selectedTopic = topic
    }
  },
  actions: {
    async refreshMessages ({ commit }, { topic, wallet }: { topic: string, wallet: Wallet }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      const entries = await keyserver.getBroadcastMessages(topic)
      if (!entries) {
        return
      }
      console.log('saving messages', entries)
      commit('setEntries', entries)
    },
    async putMessage ({ dispatch, getters }, { wallet, entry, satoshis, topic }: { wallet: Wallet, entry: AgoraMessageEntry, satoshis: number, topic: string }) {
      const keyserver = new KeyserverHandler({ wallet, networkName: displayNetwork, keyservers })
      console.log('fetching messages')
      await keyserver.createBroadcast(topic, [entry], satoshis)
      await dispatch('refreshMessages', { wallet, topic: getters.getSelectedTopic })
    }
  }
}

export default module
