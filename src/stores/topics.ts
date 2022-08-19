import assert from 'assert'
import { defineStore } from 'pinia'

import { KeyserverHandler } from 'src/cashweb/keyserver'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, keyservers } from '../utils/constants'

import { ForumMessage, ForumMessageEntry } from 'src/cashweb/types/forum'

export type MessageWithReplies = ForumMessage & {
  replies: MessageWithReplies[]
}

type Topic = string

export type TopicData = {
  threshold: number
  amount: number
  messages: MessageWithReplies[]
  topic: string
  // Last update from Epoch in seconds
  lastUpdate?: number
}

export interface State {
  topics: Record<Topic, TopicData>
  messageIndex: Record<string, MessageWithReplies | undefined>
}

export const useTopicStore = defineStore('topics', {
  state: (): State => ({
    topics: {},
    messageIndex: {},
  }),
  getters: {
    getMessage(state) {
      return (messageDigest?: string) => {
        if (!messageDigest) {
          return null
        }
        return state.messageIndex[messageDigest]
      }
    },
  },
  actions: {
    ensureTopic(topic: string): TopicData {
      if (!this.topics) {
        this.topics = {}
      }

      if (!(topic in this.topics)) {
        this.topics[topic] = {
          threshold: 0,
          messages: [],
          topic,
          amount: 1000,
          lastUpdate: 0,
        }
      }
      return this.topics[topic]
    },
    setVoteThreshold(topic: string, voteThreshold: number) {
      const topicState = this.ensureTopic(topic)
      topicState.threshold = voteThreshold
    },
    setEntries(topic: string, messages: ForumMessage[], until: number) {
      const topicState = this.ensureTopic(topic)
      topicState.lastUpdate = until

      // FIXME: It may be that a message exists in multiple topics due to the hierarchical nature
      const newMessages = messages
        .filter(m => !(m.payloadDigest in this.messageIndex))
        .map(m => ({ ...m, replies: [] }))

      topicState.messages.push(
        ...newMessages.filter(m => !(m.payloadDigest in this.messageIndex)),
      )
      for (const message of newMessages) {
        if (!message.parentDigest) {
          continue
        }
        if (!(message.parentDigest in this.messageIndex)) {
          continue
        }
        const replies = this.messageIndex[message.parentDigest]?.replies
        const found = replies?.some(
          reply => reply.payloadDigest === message.payloadDigest,
        )
        if (found) {
          return
        }
        this.messageIndex[message.parentDigest]?.replies.push(message)
      }
    },
    setMessage(topic: string, message: ForumMessage) {
      if (message.payloadDigest in this.messageIndex) {
        const oldMessage = this.messageIndex[message.payloadDigest]
        assert(oldMessage, 'Not possible, typescript hole')
        oldMessage.satoshis = message.satoshis
        return
      }
      const containsPost = message.entries.some(entry => entry.kind === 'post')
      if (!containsPost) {
        return
      }
      const topicData = this.ensureTopic(topic)

      console.log('Saving specific message', message)
      const mesageWithReplies = { ...message, replies: [] }
      topicData.messages.push(mesageWithReplies)
      this.messageIndex[message.payloadDigest] = mesageWithReplies
      if (!mesageWithReplies.parentDigest) {
        return
      }
      if (!(mesageWithReplies.parentDigest in this.messageIndex)) {
        return
      }
      const replies = this.messageIndex[mesageWithReplies.parentDigest]?.replies
      const found = replies?.some(
        reply => reply.payloadDigest === mesageWithReplies.payloadDigest,
      )
      if (found) {
        return
      }
      this.messageIndex[mesageWithReplies.parentDigest]?.replies.push(
        mesageWithReplies,
      )
    },
    async refreshMessages({
      topic,
      wallet,
    }: {
      topic: string
      wallet: Wallet
    }) {
      const topicData = this.ensureTopic(topic)
      const keyserver = new KeyserverHandler({
        wallet,
        networkName: displayNetwork,
        keyservers,
      })
      // FIXME: We will not be aware of new votes. This will need to be handled
      // through websocket subscriptions on the backend in the future.
      console.log('fetching messages')
      const from = topicData.lastUpdate
      const to = Date.now()
      console.log(from)
      const entries = await keyserver.getBroadcastMessages(
        topic,
        topicData.lastUpdate,
        to,
      )
      if (!entries) {
        return
      }
      console.log('found entries', entries)
      this.setEntries(topic, entries, to)
    },
    async putMessage({
      wallet,
      topic,
      entry,
      satoshis,
      parentDigest,
    }: {
      wallet: Wallet
      entry: ForumMessageEntry
      satoshis: number
      topic: string
      parentDigest?: string
    }) {
      const keyserver = new KeyserverHandler({
        wallet,
        networkName: displayNetwork,
        keyservers,
      })
      const payloadDigest = await keyserver.createBroadcast(
        topic,
        [entry],
        satoshis,
        parentDigest,
      )
      this.fetchMessage({ topic, payloadDigest, wallet })
    },
    async fetchMessage({
      wallet,
      payloadDigest,
      topic,
    }: {
      wallet: Wallet
      payloadDigest: string
      topic: string
    }) {
      const keyserver = new KeyserverHandler({
        wallet,
        networkName: displayNetwork,
        keyservers,
      })
      console.log('fetching message', payloadDigest)
      const message = await keyserver.getBroadcastMessage(payloadDigest)
      if (!message) {
        console.log('could not fetch message', payloadDigest)
        return
      }
      this.setMessage(topic, message)
      // Need to refetch so we get the right proxy object
      return this.getMessage(payloadDigest)
    },
    async addOffering({
      wallet,
      payloadDigest,
      satoshis,
      topic,
    }: {
      wallet: Wallet
      payloadDigest: string
      satoshis: number
      topic: string
    }) {
      const keyserver = new KeyserverHandler({
        wallet,
        networkName: displayNetwork,
        keyservers,
      })
      console.log('voting towards message', payloadDigest, satoshis)
      await keyserver.addOfferings(payloadDigest, satoshis)
      await this.fetchMessage({ topic, payloadDigest, wallet })
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      storage.put('topics', JSON.stringify(state))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      console.log('restoring topics')
      try {
        const topics = await storage.get('topics')
        const deserializedTopics = JSON.parse(topics) as Partial<State>
        console.log('loaded topics', deserializedTopics)
        return deserializedTopics
      } catch (err) {
        console.log('Unable to load topics store', err)
      }
      return {
        messageIndex: {},
        topics: {
          stamp: {
            topic: 'stamp',
            threshold: 0,
            amount: 1000,
            messages: [],
          },
        },
      }
    },
  },
})
