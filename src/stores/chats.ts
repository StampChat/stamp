import assert from 'assert'
import { defineStore } from 'pinia'

import { defaultStampAmount, displayNetwork } from '../utils/constants'
import { stampPrice } from '../cashweb/wallet/helpers'
import { desktopNotify } from '../utils/notifications'
import { store } from '../adapters/level-message-store'
import { toDisplayAddress } from '../utils/address'
import { formatBalance } from '../utils/formatting'
import { Utxo } from 'src/cashweb/types/utxo'
import type {
  Message,
  MessageItem,
  TextItem,
  ImageItem,
  StealthItem,
} from 'src/cashweb/types/messages'
import type { ReceivedMessageWrapper } from 'src/cashweb/types/user-interface'
import { useProfileStore } from './my-profile'
import { useContactStore } from './contacts'
import { mapObjIndexed, pathOr } from 'ramda'
import { STORE_SCHEMA_VERSION } from 'src/boot/pinia'

type ChatMessage = {
  outbound: boolean
  status: string
  receivedTime: number
  serverTime: number
  items: MessageItem[]
  outpoints: Utxo[]
  senderAddress: string
  payloadDigest: string
}

type ChatState = {
  address: string
  messages: ChatMessage[]
  totalUnreadMessages: number
  totalUnreadValue: number
  totalValue: number
  lastReceived: number
  lastRead: number
  stampAmount: number
}

const defaultContactObject: Omit<ChatState, 'messages' | 'address'> = {
  stampAmount: defaultStampAmount,
  totalUnreadMessages: 0,
  totalUnreadValue: 0,
  totalValue: 0,
  lastReceived: 0,
  lastRead: 0,
}

export interface State {
  activeChatAddr: string | null
  chats: Record<string, ChatState | undefined>
  messages: Record<string, Message | undefined>
  lastReceived: number | null
}

export const defaultChatsState: State = {
  chats: {},
  messages: {},
  lastReceived: null,
  activeChatAddr: null,
}

export type RestorableState = {
  activeChatAddr: string | null
  chats: Record<string, ChatState | undefined>
  messages: Record<string, Message | undefined>
  lastReceived: number | null
}

export async function rehydateChat(chatState: RestorableState): Promise<State> {
  if (!chatState) {
    return defaultChatsState
  }

  const chats: Record<string, ChatState> = {}
  const messages: Record<string, Message> = {}

  if (chatState.chats) {
    for (const [contactAddress, contact] of Object.entries(chatState.chats)) {
      assert(
        contact,
        'This is impossible, but typescript has a type hole that has to be asserted around',
      )
      chats[contactAddress] = {
        address: contactAddress,
        messages: [],
        totalUnreadMessages: 0,
        totalUnreadValue: 0,
        totalValue: 0,
        lastReceived: contact.lastReceived,
        lastRead: contact.lastRead,
        stampAmount: contact.stampAmount,
      }
    }
  }
  const localStore = await store

  const messageIterator = await localStore.getIterator()

  // Todo, this rehydrate stuff is common to receiveMessage
  for await (const messageWrapper of messageIterator) {
    if (!messageWrapper.message) {
      continue
    }
    const { index, message: newMsg, copartyAddress } = messageWrapper
    assert(newMsg.outbound !== undefined, 'outbound is not defined')
    assert(newMsg.status !== undefined, 'status is not defined')
    assert(newMsg.receivedTime !== undefined, 'receivedTime is not defined')
    assert(newMsg.serverTime !== undefined, 'serverTime is not defined')
    assert(newMsg.items !== undefined, 'items is not defined')
    assert(newMsg.outpoints !== undefined, 'outpoints is not defined')
    assert(newMsg.senderAddress !== undefined, 'senderAddress is not defined')

    const message = { payloadDigest: index, ...newMsg }
    if (!chats[copartyAddress]) {
      chats[copartyAddress] = {
        ...defaultContactObject,
        messages: [],
        address: copartyAddress,
      }
    }
    const chat = chats[copartyAddress]
    messages[index] = message
    assert(chat, 'Missing chat for message')
    chat.messages.push(message)
    chat.lastReceived = message.serverTime
    const messageValue =
      stampPrice(message.outpoints) +
      message.items.reduce((totalValue, entry) => {
        switch (entry.type) {
          case 'stealth':
            return totalValue + entry.amount
          default:
            return totalValue
        }
      }, 0)
    if (
      !newMsg.outbound &&
      chat.lastRead &&
      chat.lastRead < message.serverTime
    ) {
      chat.totalUnreadValue += messageValue
      chat.totalUnreadMessages += 1
    }
    chatState.lastReceived = message.serverTime
    chat.totalValue += messageValue
  }

  // Resort chats
  for (const contactAddress in chatState.chats) {
    chats[contactAddress]?.messages.sort(
      (messageA, messageB) => messageA.serverTime - messageB.serverTime,
    )
  }
  return {
    chats,
    messages,
    activeChatAddr: chatState.activeChatAddr,
    lastReceived: chatState.lastReceived,
  }
}

export const useChatStore = defineStore('chats', {
  state: (): State => ({ ...defaultChatsState }),
  getters: {
    getMessageByPayload: state => (payloadDigest: string) => {
      if (!state.messages) {
        return null
      }
      return state.messages[payloadDigest]
    },
    getNumUnread: state => (address: string) => {
      const displayAddress = toDisplayAddress(address)

      return state.chats[displayAddress]
        ? state.chats[displayAddress]?.totalUnreadMessages
        : 0
    },
    totalUnread(state) {
      return Object.values(state.chats)
        .map(chat => chat?.totalUnreadMessages ?? 0)
        .reduce((acc, val) => acc + val, 0)
    },
    getSortedChatOrder(state) {
      const sortedOrder = Object.values(state.chats).sort(
        (contactA, contactB) => {
          assert(contactA && contactB, 'Make typescript happy')
          if (contactB.totalUnreadValue - contactA.totalUnreadValue !== 0) {
            return contactB.totalUnreadValue - contactA.totalUnreadValue
          }

          if (contactB.totalValue - contactA.totalValue !== 0) {
            return contactB.totalValue - contactA.totalValue
          }

          if (contactB.lastRead !== contactA.lastRead) {
            return (contactB.lastRead ?? 0) - (contactA.lastRead ?? 0)
          }

          if (
            contactB.totalUnreadMessages - contactA.totalUnreadMessages !==
            0
          ) {
            return contactB.totalUnreadMessages - contactA.totalUnreadMessages
          }

          // No other tiebreakers
          return 0
        },
      )
      return sortedOrder
    },
    lastRead: state => (address: string) => {
      const displayAddress = toDisplayAddress(address)

      return state.chats[displayAddress]?.lastRead ?? 0
    },
    getStampAmount: state => (address: string) => {
      const displayAddress = toDisplayAddress(address)
      const chat = state.chats[displayAddress]
      if (!chat) {
        return defaultStampAmount
      }

      return chat.stampAmount ?? defaultStampAmount
    },
    getLatestMessage: state => (address: string) => {
      const displayAddress = toDisplayAddress(address)
      const nopInfo = {
        outbound: false,
        text: '',
      }
      const chat = state.chats[displayAddress]
      if (!chat) {
        return nopInfo
      }

      const nMessages = Object.keys(chat.messages).length
      if (nMessages === 0) {
        return nopInfo
      }

      const lastMessage = chat.messages[chat.messages.length - 1]
      const items = lastMessage.items
      const lastItem = items[items.length - 1]

      if (!lastItem) {
        console.error(displayAddress)
        return null
      }
      if (lastItem.type === 'text') {
        const info = {
          outbound: lastMessage.outbound,
          text: lastItem.text,
        }
        return info
      }

      if (lastItem.type === 'image') {
        const info = {
          outbound: lastMessage.outbound,
          text: 'Sent image',
        }
        return info
      }

      if (lastItem.type === 'stealth') {
        const info = {
          outbound: lastMessage.outbound,
          text: 'Sent Lotus',
        }
        return info
      }

      return nopInfo
    },
    getLastReceived(state) {
      return state.lastReceived
    },
  },
  actions: {
    deleteMessage({
      address,
      payloadDigest,
    }: {
      address: string
      payloadDigest: string
    }) {
      const displayAddress = toDisplayAddress(address)

      delete this.messages[payloadDigest]
      const chat = this.chats[displayAddress]
      if (!chat) {
        return
      }
      const msgIndex = chat.messages.findIndex(
        msg => msg.payloadDigest === payloadDigest,
      )
      chat.messages.splice(msgIndex, 1)
    },
    readAll(address: string) {
      const displayAddress = toDisplayAddress(address)
      const chat = this.chats[displayAddress]
      if (!chat) {
        console.error('Trying to readAll messages from non-existant contact')
        return
      }
      const values = chat.messages
      if (values.length === 0) {
        chat.lastRead = 0
      } else {
        chat.lastRead = Math.max(
          values[values.length - 1].serverTime,
          chat.lastRead ?? 0,
        )
      }
      chat.totalUnreadMessages = 0
      chat.totalUnreadValue = 0
    },
    reset() {
      this.chats = Object.fromEntries(
        Object.entries(this.chats).map(([address, chatData]) => {
          assert(chatData, 'Not possible')
          return [
            address,
            {
              ...chatData,
              messages: [],
            },
          ]
        }),
      )
      this.messages = {}
      this.lastReceived = null
    },
    sendMessageLocal({
      address,
      senderAddress,
      index: payloadDigest,
      items,
      outpoints = [],
      status = 'pending',
      previousHash = null,
    }: {
      address: string
      senderAddress: string
      index: string
      items: MessageItem[]
      outpoints: Utxo[]
      status: string
      previousHash: string | null
    }) {
      const displayAddress = toDisplayAddress(address)
      const timestamp = Date.now()
      const newMsg = {
        outbound: true,
        status,
        items,
        serverTime: timestamp,
        receivedTime: timestamp,
        outpoints,
        senderAddress,
        messageHash: payloadDigest,
      }
      assert(newMsg.outbound !== undefined, 'outbound is not defined')
      assert(newMsg.status !== undefined, 'status is not defined')
      assert(newMsg.receivedTime !== undefined, 'receivedTime is not defined')
      assert(newMsg.serverTime !== undefined, 'serverTime is not defined')
      assert(newMsg.items !== undefined, 'items is not defined')
      assert(newMsg.outpoints !== undefined, 'outpoints is not defined')
      assert(newMsg.senderAddress !== undefined, 'senderAddress is not defined')

      const message = { payloadDigest: payloadDigest, ...newMsg }
      if (payloadDigest in this.messages) {
        // we have the message already, just need to update some fields and return
        this.messages[payloadDigest] = Object.assign(
          this.messages[payloadDigest],
          message,
        )
        return
      }

      // Chat may be null if it is a self send
      const chat = this.chats[displayAddress]
      if (!chat) {
        // This was a self send, we don't want to update any particular chats.
        return
      }

      if (previousHash && previousHash in this.messages) {
        // we have the message already, just need to update some fields and return
        const msgIndex = chat.messages.findIndex(
          msg => msg.payloadDigest === previousHash,
        )
        chat.messages.splice(msgIndex, 1)
        delete this.messages[payloadDigest]
        return
      }

      this.messages[payloadDigest] = message
      if (displayAddress in this.chats) {
        chat.messages.push(message)
        chat.lastRead = Date.now()
        return
      }
      this.chats[displayAddress] = {
        ...defaultContactObject,
        messages: [message],
        address: displayAddress,
      }
    },
    clearChat(address: string) {
      const displayAddress = toDisplayAddress(address)

      const chat = this.chats[displayAddress]
      if (!chat) {
        return
      }
      chat.messages = []
    },
    deleteChat(address: string) {
      const displayAddress = toDisplayAddress(address)
      delete this.chats[displayAddress]
    },
    setStampAmount({
      address,
      stampAmount,
    }: {
      address: string
      stampAmount: number
    }) {
      const chat = this.chats[address]
      if (!chat) {
        console.error('attempting to set stamp amount for non-existant contact')
        return
      }
      chat.stampAmount = stampAmount
    },
    async receiveMessages(messageWrappers: ReceivedMessageWrapper[]) {
      console.log('receiving messages')
      // Ensure contacts are all setup
      for (const messageWrapper of messageWrappers) {
        const {
          outbound,
          copartyAddress,
          copartyPubKey,
          message: newMsg,
          stampValue,
        } = messageWrapper
        // Check whether contact exists
        const contacts = useContactStore()
        if (!contacts.isContact(copartyAddress)) {
          // Add dummy contact

          contacts.addLoadingContact({
            address: copartyAddress,
            pubKey: copartyPubKey,
          })

          // Load contact
          await contacts.refresh(copartyAddress)
        }

        const profileStore = useProfileStore()

        // Ignore messages below acceptance price
        const acceptancePrice = profileStore.inbox.acceptancePrice ?? 0
        const lastRead = this.lastRead(copartyAddress)

        const acceptable = stampValue >= acceptancePrice
        // If not focused (and not outbox message) then notify
        if (
          document.hasFocus() ||
          outbound ||
          !acceptable ||
          lastRead > newMsg.serverTime ||
          // Don't notify or reset active chat if we are bulk loading messages
          messageWrappers.length !== 1
        ) {
          continue
        }

        const contactStore = useContactStore()

        const contact = contactStore.getContact(copartyAddress)
        const textItem: TextItem = (newMsg.items.find(
          item => item.type === 'text',
        ) as TextItem) ?? { text: '' }
        const stealthItem: StealthItem = (newMsg.items.find(
          item => item.type === 'stealth',
        ) as StealthItem) ?? { amount: 0 }
        const imageItem: ImageItem = (newMsg.items.find(
          item => item.type === 'image',
        ) as ImageItem) ?? { image: '' }

        let body = ''
        if (stealthItem.amount > 0) {
          const formatted = formatBalance(stealthItem.amount)
          body = `[${formatted}] ` + body
        }
        if (imageItem.image.length > 0) {
          body = '[Image] ' + body
        }
        body = body + textItem.text
        if (contact && contact.notify) {
          desktopNotify(
            contact.profile.name ?? 'Unknown',
            body,
            contact.profile.avatar ?? '',
            async () => (this.activeChatAddr = copartyAddress),
          )
        }
      }

      for (const wrapper of messageWrappers) {
        const {
          copartyAddress,
          index,
          message: newMsg,
        }: { copartyAddress: string; index: string; message: Message } = wrapper

        assert(newMsg.outbound !== undefined, 'outbound is not defined')
        assert(newMsg.status !== undefined, 'status is not defined')
        assert(newMsg.receivedTime !== undefined, 'receivedTime is not defined')
        assert(newMsg.serverTime !== undefined, 'serverTime is not defined')
        assert(newMsg.items !== undefined, 'items is not defined')
        assert(newMsg.outpoints !== undefined, 'outpoints is not defined')
        assert(
          newMsg.senderAddress !== undefined,
          'senderAddress is not defined',
        )
        assert(copartyAddress !== undefined, 'address is not defined')
        assert(index !== undefined, 'index is not defined')
        const displayAddress = toDisplayAddress(copartyAddress)

        const message = { payloadDigest: index, ...newMsg }
        if (index in this.messages) {
          // Mutate the object so that it striggers reactivity
          this.messages[index] = Object.assign(this.messages[index], message)
          // We should already have created the chat if we have the message
          return
        }
        // We don't need reactivity here
        this.messages[index] = message
        if (!(displayAddress in this.chats)) {
          // We do need reactivity to create a new chat
          this.chats[displayAddress] = {
            ...defaultContactObject,
            messages: [],
            address: displayAddress,
          }
        }
        const chat = this.chats[displayAddress]
        assert(chat, 'not possible')

        // TODO: Better indexing
        chat.messages.push(message)
        chat.lastReceived = message.serverTime
        const messageValue =
          stampPrice(message.outpoints) +
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message.items.reduce((totalValue: number, entry: any) => {
            switch (entry.type) {
              case 'stealth':
                return totalValue + entry.amount
              default:
                return totalValue
            }
          }, 0)
        if (
          displayAddress !== this.activeChatAddr &&
          chat.lastRead < message.serverTime
        ) {
          chat.totalUnreadValue += messageValue
          chat.totalUnreadMessages += 1
        }
        this.lastReceived = message.serverTime
        chat.totalValue += messageValue
      }
    },
  },
  storage: {
    save(storage, _mutation, state): void {
      const chats = {
        activeChatAddr: pathOr(undefined, ['activeChatAddr'], state),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        chats: mapObjIndexed((addressData: Record<string, unknown>) => {
          return {
            ...addressData,
            // Overwrite messages because storing them would be prohibitive.
            messages: [],
          }
        }, state.chats),
        messages: {},
        lastReceived: state.lastReceived ?? 0,
      }
      storage.put('chats', JSON.stringify(chats))
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restore(storage, metadata): Promise<Partial<State>> {
      let chats = '{}'
      try {
        chats = await storage.get('chats')
      } catch (err) {
        //
      }
      const deserializedChats = JSON.parse(chats) as RestorableState

      const invalidStore =
        metadata.networkName !== displayNetwork ||
        metadata.version !== STORE_SCHEMA_VERSION
      if (invalidStore) {
        return { ...defaultChatsState }
      }

      const rehydratedChat = await rehydateChat(deserializedChats)

      return rehydratedChat
    },
  },
})
