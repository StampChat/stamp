import { RelayClient } from '../relay/client'
import { defaultRelayUrl } from '../utils/constants'
import { store as levelDbStore } from '../adapters/level-message-store'

export async function getRelayClient ({ wallet, electrumClient, store, relayUrl = defaultRelayUrl }) {
  const observables = { connected: false }
  const client = new RelayClient(relayUrl, wallet, electrumClient, {
    getPubKey: (address) => {
      const destPubKey = store.getters['contacts/getPubKey'](address)
      return destPubKey
    },
    messageStore: await levelDbStore
  })
  client.events.on('disconnected', () => {
    observables.connected = false
  })
  client.events.on('error', (err) => {
    console.log(err)
  })
  client.events.on('opened', () => { observables.connected = true })
  client.events.on('messageSending', ({ address, senderAddress, index, items, outpoints, transactions, previousHash }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints, transactions, previousHash })
  })
  client.events.on('messageSendError', ({ address, senderAddress, index, items, outpoints, transactions, previousHash }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints, transactions, previousHash, status: 'error' })
  })
  client.events.on('messageSent', ({ address, senderAddress, index, items, outpoints, transactions, previousHash }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints, transactions, previousHash, status: 'confirmed' })
  })
  client.events.on('receivedMessage', ({ outbound, copartyAddress, copartyPubKey, index, newMsg, ...args }) => {
    store.dispatch('chats/receiveMessage', { outbound, copartyAddress, copartyPubKey, index, newMsg, ...args })
    if (outbound) {
      return
    }
    const { serverTime, items } = newMsg
    const lastRead = store.getters['chats/lastRead'](copartyAddress)
    const contactFractions = store.getters['chats/getFractions'](copartyAddress)

    store.commit('chats/readAll', copartyAddress)
    if ((lastRead && serverTime < lastRead) || serverTime <= Date.now() - 1000) {
      return
    }

    const contactsMap = store.getters['contacts/getContacts']
    const senderContact = contactsMap[copartyAddress]
    const sendName = path(['profile', 'name'], senderContact)
    const totalSent = items.filter(item => item.type === 'stealth').reduce((total, { amount }) => total + amount, 0)

    const messageHeader = sendName === 'Loading...'
      ? `*[${copartyAddress}](${copartyAddress})*`
      : `**${path(['profile', 'name'], senderContact)}** *([${copartyAddress}](${copartyAddress}))*`

    const newItems = [{
      type: 'text',
      text: messageHeader
    },
    ...items.filter(item => item.type === 'text')
    ]
    const minimumStampAmount = 1000

    const sortedContacts = Object.entries(contactsMap).sort(([contactA], [contactB]) => (contactFractions[contactA] || 0) - (contactFractions[contactB] || 0))

    let amountLeft = Math.trunc((newMsg.stampValue + totalSent) * 0.999)
    for (const [contact] of sortedContacts) {
      if (contact === copartyAddress) {
        // Don't echo messages
        continue
      }
      const fraction = contactFractions[contact]
      const stampAmount = Math.trunc(amountLeft * fraction)
      // We can't send anymore money. Keep the change.
      if (stampAmount < minimumStampAmount) {
        return
      }
      amountLeft -= stampAmount
      client.sendMessageImpl({ address: contact, items: newItems, stampAmount })
    }
  })

  return { client, observables }
}
