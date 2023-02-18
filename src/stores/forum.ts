import assert from 'assert'
import { defineStore } from 'pinia'
import { indexBy, uniq } from 'ramda'

import { RegistryHandler } from 'src/cashweb/registry'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, registrys } from '../utils/constants'

import { ForumMessage, ForumMessageEntry } from 'src/cashweb/types/forum'
import { SortMode } from 'src/utils/sorting'

export type MessageWithReplies = ForumMessage & {
  replies: MessageWithReplies[]
  timestamp: Date | string
}

export interface State {
  messages: MessageWithReplies[]
  index: Record<string, MessageWithReplies | undefined>
  topics: string[]
  selectedTopic: string
  sortMode: SortMode
  duration: number
  voteThreshold: number
}

export const useForumStore = defineStore('forum', {
  state: (): State => ({
    messages: [],
    index: {},
    topics: [],
    selectedTopic: '',
    sortMode: 'hot',
    // 1 week
    duration: 1000 * 60 * 60 * 24 * 7,
    voteThreshold: 0,
  }),
  getters: {
    getMessage(state) {
      return (messageDigest?: string) => {
        console.log('messageDigest', messageDigest)
        if (!messageDigest) {
          return null
        }
        return state.index[messageDigest]
      }
    },
  },
  actions: {
    setSortMode(sortMode: SortMode) {
      this.sortMode = sortMode
    },
    setDuration(duration: number) {
      this.duration = duration
    },
    setVoteThreshold(voteThreshold: number) {
      this.voteThreshold = voteThreshold
    },

    setEntries(messages: ForumMessage[]) {
      const newMessages = messages
        .filter(m => !(m.payloadDigest in this.index))
        .map(m => ({ ...m, replies: [] }))
      this.messages.push(
        ...newMessages.filter(m => !(m.payloadDigest in this.index)),
      )
      this.index = indexBy(message => message.payloadDigest, this.messages)
      this.topics = uniq(messages.map(message => message.topic))
      for (const message of newMessages) {
        if (!message.parentDigest) {
          continue
        }
        if (!(message.parentDigest in this.index)) {
          continue
        }
        const replies = this.index[message.parentDigest]?.replies
        const found = replies?.some(
          reply => reply.payloadDigest === message.payloadDigest,
        )
        if (found) {
          return
        }
        this.index[message.parentDigest]?.replies.push(message)
      }
    },
    setMessage(message: ForumMessage) {
      if (message.payloadDigest in this.index) {
        const oldMessage = this.index[message.payloadDigest]
        assert(oldMessage, 'Not possible, typescript hole')
        oldMessage.satoshis = message.satoshis
        return
      }
      const containsPost = message.entries.some(entry => entry.kind === 'post')
      if (!containsPost) {
        return
      }

      console.log('Saving specific message', message)
      const mesageWithReplies = { ...message, replies: [] }
      this.messages.push(mesageWithReplies)
      this.index = indexBy(message => message.payloadDigest, this.messages)
      this.topics = uniq(this.messages.map(message => message.topic))
      if (!mesageWithReplies.parentDigest) {
        return
      }
      if (!(mesageWithReplies.parentDigest in this.index)) {
        return
      }
      const replies = this.index[mesageWithReplies.parentDigest]?.replies
      const found = replies?.some(
        reply => reply.payloadDigest === mesageWithReplies.payloadDigest,
      )
      if (found) {
        return
      }
      this.index[mesageWithReplies.parentDigest]?.replies.push(
        mesageWithReplies,
      )
    },
    setSelectedTopic(topic: string) {
      this.selectedTopic = topic
    },
    pushNewTopic(topic: string) {
      this.topics.push(topic)
    },
    async refreshMessages({ wallet }: { topic: string; wallet: Wallet }) {
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      console.log('fetching messages')
      const from = Date.now() - this.duration
      console.log(from)
      const entries = await registry.getBroadcastMessages('', from)
      if (!entries) {
        return
      }
      this.setEntries(entries)
    },
    async putMessage({
      wallet,
      entry,
      satoshis,
      topic,
      parentDigest,
    }: {
      wallet: Wallet
      entry: ForumMessageEntry
      satoshis: number
      topic: string
      parentDigest?: string
    }) {
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      console.log('fetching messages')
      const payloadDigest = await registry.createBroadcast(
        topic,
        [entry],
        satoshis,
        parentDigest,
      )
      this.fetchMessage({ payloadDigest, wallet })
    },
    async fetchMessage({
      wallet,
      payloadDigest,
    }: {
      wallet: Wallet
      payloadDigest: string
    }) {
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      console.log('fetching message', payloadDigest)
      const message = await registry.getBroadcastMessage(payloadDigest)
      if (!message) {
        console.log('could not fetch message', payloadDigest)
        return
      }
      this.setMessage(message)
      // Need to refetch so we get the right proxy object
      return this.getMessage(payloadDigest)
    },
    async addOffering({
      wallet,
      payloadDigest,
      satoshis,
    }: {
      wallet: Wallet
      payloadDigest: string
      satoshis: number
    }) {
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      console.log('voting towards message', payloadDigest, satoshis)
      await registry.addOfferings(payloadDigest, satoshis)
      await this.fetchMessage({ payloadDigest, wallet })
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      storage.put('forum', JSON.stringify(state))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      let forum = '{}'
      try {
        forum = await storage.get('forum')
      } catch (err) {
        //
      }
      const deserializedForum = JSON.parse(forum) as State
      return deserializedForum
    },
  },
})
