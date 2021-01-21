import { RelayClient } from '../relay/client'
import { defaultRelayUrl } from '../utils/constants'
import { store as levelDbStore } from '../adapters/level-message-store'
import { path } from 'ramda'
import { toDisplayAddress } from '../utils/address'

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
    const { rewards, totalValue } = store.getters['chats/getFractions']

    store.commit('chats/readAll', copartyAddress)
    if ((lastRead && serverTime < lastRead) || serverTime <= Date.now() - 1000) {
      return
    }
    const contactsMap = store.getters['contacts/getContacts']
    const senderContact = contactsMap[copartyAddress]
    const sendName = path(['profile', 'name'], senderContact)
    const totalSent = items.filter(item => item.type === 'stealth').reduce((total, { amount }) => total + amount, 0)

    const displayCoParty = toDisplayAddress(copartyAddress)
    const messageHeader = sendName === 'Loading...'
      ? `*[${displayCoParty}](${displayCoParty})*`
      : `**${path(['profile', 'name'], senderContact)}** *([${displayCoParty}](${displayCoParty}))*`

    const newItems = [{
      type: 'text',
      text: messageHeader
    },
    ...items.filter(item => item.type === 'text')
    ]
    const senderTotal = rewards[copartyAddress]

    const logFractions = Object.entries(rewards).map(([contact, contactTotal]) => {
      const logFraction = Math.log(contactTotal) / Math.log(totalValue - senderTotal)
      return [contact, Math.max(logFraction, 0)]
    })
    const totalFractions = logFractions.reduce((total, [, logFraction]) => total + logFraction, 0)
    const sortedContacts = logFractions.map(
      ([contact, logFraction]) => [contact, logFraction / totalFractions]
    ).sort(([, contactAFraction], [, contactBFraction]) => (contactBFraction || 0) - (contactAFraction || 0))

    const totalAmountReceived = Math.trunc((newMsg.stampValue + totalSent) * 0.999)
    let amountLeft = totalAmountReceived
    const minimumStampAmount = 1000
    console.log(sortedContacts)
    for (const [contact, fraction] of sortedContacts) {
      if (Number.isNaN(fraction) || !fraction) {
        continue
      }
      if (contact === copartyAddress) {
        // Don't echo messages
        continue
      }
      const maybeStampAmount = Math.trunc(amountLeft * fraction)
      const stampAmount = maybeStampAmount < minimumStampAmount ? Math.min(amountLeft, minimumStampAmount) : maybeStampAmount
      amountLeft -= stampAmount
      client.sendMessageImpl({ address: contact, items: newItems, stampAmount })
      // We can't send anymore money. Keep the change.
      if (amountLeft < minimumStampAmount) {
        return
      }
    }
  })

  return { client, observables }
}
