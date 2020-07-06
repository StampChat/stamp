import { RelayClient } from '../relay/client'
import { defaultRelayUrl } from '../utils/constants'
import { store as levelDbStore } from '../adapters/level-message-store'

export function getRelayClient ({ wallet, electrumClient, store, relayUrl = defaultRelayUrl }) {
  const observables = { connected: false }
  const client = new RelayClient(relayUrl, wallet, electrumClient, {
    getPubKey: (address) => {
      const destPubKey = store.getters['contacts/getPubKey'](address)
      return destPubKey
    },
    messageStore: levelDbStore
  })
  client.events.on('disconnected', () => {
    observables.connected = false
  })
  client.events.on('error', (err) => {
    console.log(err)
  })
  client.events.on('opened', () => { observables.connected = true })
  client.events.on('messageSending', ({ address, senderAddress, index, items, outpoints, transactions }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints, transactions })
  })
  client.events.on('messageSendError', ({ address, senderAddress, index, items, outpoints, transactions, retryData }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints, transactions, retryData, status: 'error' })
  })
  client.events.on('messageSent', ({ address, senderAddress, index, items, outpoints, transactions }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints, transactions, status: 'confirmed' })
  })
  client.events.on('receivedMessage', (args) => {
    store.dispatch('chats/receiveMessage', args)
  })

  return { client, observables }
}
