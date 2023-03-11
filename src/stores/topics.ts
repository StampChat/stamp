import assert from 'assert'
import { defineStore } from 'pinia'

import { RegistryHandler } from 'src/cashweb/registry'
import { Wallet } from 'src/cashweb/wallet'
import { displayNetwork, registrys } from '../utils/constants'

import { ForumMessage, ForumMessageEntry } from 'src/cashweb/types/forum'

export type MessageWithReplies = ForumMessage & {
  replies: MessageWithReplies[]
}

type Topic = string

const defaultOffering = 100_000_000
// How far back should we fetch messages if we have never fetched?
const defaultFetchDuration = Date.now() - 1000 * 60 * 60 * 24 * 7
const defaultTopics = [
  {
    topic: 'stamp',
    threshold: 0,
    offering: defaultOffering,
    messages: [],
  },
  {
    topic: 'news',
    threshold: 0,
    offering: defaultOffering,
    messages: [],
  },
  {
    topic: 'trading',
    threshold: 0,
    offering: defaultOffering,
    messages: [],
  },
  {
    topic: 'memes',
    threshold: 0,
    offering: defaultOffering,
    messages: [],
  },
  {
    topic: 'help',
    threshold: 0,
    offering: defaultOffering,
    messages: [],
  },
]

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

export type ReducedTopicData = {
  threshold: number
  offering: number
  // These will be reborn from the messageIndex
  messages: string[]
  topic: string
  // Last update from Epoch in seconds
  lastUpdate?: number
}

interface ReducedState {
  topics: ReducedTopicData[]
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
          offering: defaultOffering,
          lastUpdate: defaultFetchDuration,
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

      // Update votes for any messages we already had.
      const oldMessages = transformedMessages.filter(
        m => m.payloadDigest in this.messageIndex,
      )
      for (const newOldMessage of oldMessages) {
        const oldMessage = this.messageIndex[newOldMessage.payloadDigest]
        assert(oldMessage, 'Not possible, typescript hole')
        oldMessage.satoshis = newOldMessage.satoshis
      }

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
      console.log('Updating topic message', newMessage.payloadDigest)

      if (newMessage.payloadDigest in this.messageIndex) {
        const oldMessage = this.messageIndex[newMessage.payloadDigest]
        assert(oldMessage, 'Not possible, typescript hole')
        console.log(
          'Updating votes for message',
          newMessage.payloadDigest,
          newMessage.satoshis / 1_000_000,
        )
        oldMessage.satoshis = newMessage.satoshis
      } else {
        const mesageWithReplies = { ...newMessage, replies: [] }
        this.messageIndex[newMessage.payloadDigest] = mesageWithReplies
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const message = this.messageIndex[newMessage.payloadDigest]!
      const topicData = this.ensureTopic(topic)
      if (
        !topicData.messages.some(
          oldMessage => message.payloadDigest === oldMessage.payloadDigest,
        )
      ) {
        topicData.messages.push(message)
      }

      console.log('Updated a specific message', newMessage.payloadDigest)

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
      this.messageIndex[message.parentDigest]?.replies.push(message)
    },
    async refreshMessages({
      topic,
      wallet,
    }: {
      topic: string
      wallet: Wallet
    }) {
      const topicData = this.ensureTopic(topic)
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      // FIXME: We will not be aware of new votes. This will need to be handled
      // through websocket subscriptions on the backend in the future.
      const from = topicData.lastUpdate ?? defaultFetchDuration
      const to = Date.now()
      console.log('fetching messages', topic, from, to)
      const entries = await registry.getBroadcastMessages(topic, from, to)
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
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      const payloadDigest = await registry.createBroadcast(
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
      const registry = new RegistryHandler({
        wallet,
        networkName: displayNetwork,
        registrys,
      })
      console.log('voting towards message', payloadDigest, satoshis)
      await registry.addOfferings(payloadDigest, satoshis)
      await this.fetchMessage({ topic, payloadDigest, wallet })
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      const reduceState = (): ReducedState => {
        const topics: ReducedTopicData[] = Object.values(state.topics).map(
          topic => ({
            ...topic,
            messages: topic.messages.map(message => message.payloadDigest),
          }),
        )
        return {
          ...state,
          topics,
        }
      }
      const reducedState = reduceState()
      storage.put('topics', JSON.stringify(reducedState))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage): Promise<Partial<State>> {
      const processSerializedTopics = (
        deserializedState: Partial<ReducedState>,
      ): State => {
        const hydratedState: State = {
          messageIndex: deserializedState.messageIndex ?? {},
          // Add default topics
          topics: Object.fromEntries(
            defaultTopics.map(topic => {
              return [topic.topic, topic]
            }),
          ),
        }
        const messageIndex = hydratedState.messageIndex

        if (!('topics' in deserializedState)) {
          deserializedState.topics = []
        }
        if (!(deserializedState.topics instanceof Array)) {
          deserializedState.topics = []
        }
        assert(deserializedState.topics)
        // This should work on the old serialized state
        for (const topic of deserializedState.topics) {
          const validMessages = topic.messages.filter(
            payloadDigest => payloadDigest in messageIndex,
          )
          hydratedState.topics[topic.topic] = {
            ...topic,
            // We know these messages will be defined as they existed in the index
            messages: validMessages.map(
              payloadDigest => messageIndex[payloadDigest],
            ) as MessageWithReplies[],
          }
        }

        return hydratedState
      }

      try {
        const topics = await storage.get('topics')
        const deserializedTopics = JSON.parse(topics) as Partial<ReducedState>
        console.log('loaded topics', deserializedTopics)
        return processSerializedTopics(deserializedTopics)
      } catch (err) {
        console.log('Unable to load topics store', err)
      }
      return processSerializedTopics({
        messageIndex: {},
        topics: [],
      })
    },
  },
})
