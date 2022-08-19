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
  offering: number
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
    getTopics(state) {
      return Object.keys(state.topics)
    },
  },
  actions: {
    deleteTopic(topic: string) {
      delete this.topics[topic]
    },
    ensureTopic(topic: string): TopicData {
      if (!this.topics) {
        this.topics = {}
      }

      if (!(topic in this.topics)) {
        this.topics[topic] = {
          threshold: 0,
          messages: [],
          topic,
          offering: 1_000_000,
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
      console.log('settings entries', messages)

      const transformedMessages = messages.map(m => ({ ...m, replies: [] }))

      const newMessages = transformedMessages.filter(
        m => !(m.payloadDigest in this.messageIndex),
      )

      for (const message of newMessages) {
        this.messageIndex[message.payloadDigest] = message
      }

      // Setup all the reply data
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
          continue
        }
        this.messageIndex[message.parentDigest]?.replies.push(message)
      }
      // FIXME: Linear search not ideal

      const messagesNewToTopic = transformedMessages
        .map(message => {
          const existingMessageObject = this.messageIndex[message.payloadDigest]
          // We know this is not undefined here, but check
          assert(existingMessageObject)
          return existingMessageObject
        })
        .filter(
          message =>
            !topicState.messages.some(
              oldMessage => message.payloadDigest === oldMessage.payloadDigest,
            ),
        )
      topicState.messages.push(...messagesNewToTopic)
    },
    setMessage(topic: string, newMessage: ForumMessage) {
      if (newMessage.payloadDigest in this.messageIndex) {
        const oldMessage = this.messageIndex[newMessage.payloadDigest]
        assert(oldMessage, 'Not possible, typescript hole')
        oldMessage.satoshis = newMessage.satoshis
      } else {
        const mesageWithReplies = { ...newMessage, replies: [] }
        this.messageIndex[newMessage.payloadDigest] = mesageWithReplies
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const message = this.messageIndex[newMessage.payloadDigest]!
      const topicData = this.ensureTopic(topic)
      if (!topicData.messages.some(
        oldMessage => message.payloadDigest === oldMessage.payloadDigest,
      )
      )

        topicData.messages.push(message)
      this.messageIndex[message.payloadDigest] = message
      if (!message.parentDigest) {
        return
      }
      if (!(message.parentDigest in this.messageIndex)) {
        return
      }
      const replies = this.messageIndex[message.parentDigest]?.replies
      const found = replies?.some(
        reply => reply.payloadDigest === message.payloadDigest,
      )
      if (found) {
        return
      }
      this.messageIndex[message.parentDigest]?.replies.push(
        message,
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
      console.log('found entries', topic, entries.length)
      this.setEntries(topic, entries, to)
    },
    async putMessage({
      wallet,
      topic,
      entry,
      parentDigest,
    }: {
      wallet: Wallet
      entry: ForumMessageEntry
      topic: string
      parentDigest?: string
    }) {
      const topicData = this.ensureTopic(topic)
      const satoshis = topicData.offering
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
            offering: 1000,
            messages: [],
          },
          news: {
            topic: 'news',
            threshold: 0,
            offering: 1000,
            messages: [],
          },
          crypto: {
            topic: 'crypto',
            threshold: 0,
            offering: 1000,
            messages: [],
          },
        },
      }
    },
  },
})
