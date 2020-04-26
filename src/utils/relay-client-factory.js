import { RelayClient } from '../relay/client'
import { defaultRelayUrl } from '../utils/constants'

export function getRelayClient ({ wallet, electrumClient, store, relayUrl = defaultRelayUrl }) {
  const observables = { connected: false }
  const client = new RelayClient(relayUrl, wallet, electrumClient, {
    getPubKey: (addr) => {
      const destPubKey = store.getters['contacts/getPubKey'](addr)
      return destPubKey
    },
    getStoredMessage: (paylgoadDiestHex) => {
      const message = store.getters['chats/getMessageByPayload'](paylgoadDiestHex)
      return message
    }
  })
  client.events.on('disconnected', () => {
    observables.connected = false
  })
  client.events.on('error', (err) => {
    console.log(err)
  })
  client.events.on('opened', () => { observables.connected = true })
  client.events.on('messageSending', ({ addr, index, items, outpoints }) => {
    store.commit('chats/sendMessageLocal', { addr, index, items, outpoints })
  })
  client.events.on('messageSendError', ({ addr, index, items, retryData }) => {
    store.commit('chats/sendMessageLocal', { addr, index, items, retryData, status: 'error' })
  })
  client.events.on('messageSent', ({ addr, index, items, outpoints }) => {
    // TODO: Why no items here?
    store.commit('chats/sendMessageLocal', { addr, index, items, outpoints, status: 'confirmed' })
  })
  client.events.on('receivedMessage', (args) => {
    // TODO: Why no items here?
    store.dispatch('chats/receiveMessage', args)
  })

  return { client, observables }
}
