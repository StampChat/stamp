import { toRaw, reactive } from 'vue'

import { RelayClient } from '../cashweb/relay'
import { defaultRelayUrl, networkName } from '../utils/constants'
import { store as levelDbStore } from '../adapters/level-message-store'
import { path } from 'ramda'
import { toDisplayAddress } from '../utils/address'
import { formatBalance } from '../utils/formatting'

const timePeriod = 1000 * 60 * 60 * 24 // 1 Day
const giveAwayTiming = 1000 * 60 * 60 * 2
const margin = 0.01
const minimumStampAmount = 500000
let lastGiveaway = Date.now() - giveAwayTiming

const winAmount = (balance) => Math.trunc((balance / timePeriod * giveAwayTiming) * (1 - margin))

const pickWinner = function (arr) {
  // let element = Math.random()
  // Arr is an element and a probability
  // for (const [address, probability] of arr) {
  //   element -= probability
  //   if (element < 0) {
  //     return address
  //   }
  // }
  return arr[Math.floor(Math.random() * arr.length)][0]
}

export async function getRelayClient ({ wallet, electrumClient, store, relayUrl = defaultRelayUrl }) {
  const observables = reactive({ connected: false })

  const timerData = { timerId: null }

  const client = new RelayClient(relayUrl, wallet, electrumClient, {
    getPubKey: (address) => {
      const destPubKey = store.getters['contacts/getPubKey'](address)
      return destPubKey
    },
    networkName,
    messageStore: await levelDbStore
  })

  const giveAway = () => {
    try {
      if (!store) {
        return
      }
      const { rewards, totalValue } = store.getters['chats/getFractions'](timePeriod)

      const logFractions = Object.entries(rewards).map(([contact, contactTotal]) => {
        const logFraction = Math.log(contactTotal) / Math.log(totalValue)
        return [contact, Math.max(logFraction, 0)]
      })
      const totalFractions = logFractions.reduce((total, [, logFraction]) => total + logFraction, 0)
      const sortedContacts = logFractions.map(
        ([contact, logFraction]) => [contact, logFraction / totalFractions]
      )
        .sort(([, contactAFraction], [, contactBFraction]) => (contactBFraction || 0) - (contactAFraction || 0))
        .filter(([, probability]) => !Number.isNaN(probability) && probability > 0)

      // Second param is chance
      // TODO: use chance to pick one
      const winner = pickWinner(sortedContacts)
      if (!winner) {
        console.log('No winner found! People should talk more!')
        return
      }
      const balance = store.getters['wallet/balance']
      const giveAwayAmount = winAmount(balance)
      if (Date.now() <= lastGiveaway + giveAwayTiming) {
        return
      }

      const contactsMap = store.getters['contacts/getContacts']
      const senderContact = contactsMap[winner]
      const sendName = path(['profile', 'name'], senderContact)
      const displayCoParty = toDisplayAddress(winner)
      const messageHeader = sendName === 'Loading...'
        ? `*[${displayCoParty}](${displayCoParty})*`
        : `[**${path(['profile', 'name'], senderContact)}**](#/chat/${displayCoParty})`

      const newItems = [
        {
          type: 'text',
          text: `${messageHeader} has won **${formatBalance(giveAwayAmount)}**!`
        }]

      lastGiveaway = Date.now()
      //  the total number of people we send notifications to!
      const amountLeft = giveAwayAmount

      for (const [contact, fraction] of sortedContacts) {
        if (contact === winner) {
          // Don't echo messages
          continue
        }

        if (Number.isNaN(fraction) || !fraction) {
          continue
        }
        client.sendMessageImpl({ address: contact, items: newItems, stampAmount: minimumStampAmount })
        // We can't send anymore money. Keep the change.
        if (amountLeft < minimumStampAmount) {
          break
        }
      }

      const winnerItems = [{
        type: 'text',
        text: "You've won the giveaway!"
      },
      {
        type: 'stealth',
        amount: giveAwayAmount
      }]

      client.sendMessageImpl({ address: winner, items: winnerItems, stampAmount: minimumStampAmount })
    } finally {
      timerData.timerId = setTimeout(giveAway, 10_000)
    }
  }

  client.events.on('disconnected', () => {
    clearTimeout(timerData.timerId)
    observables.connected = false
  })
  client.events.on('error', (err) => {
    console.log(err)
  })
  client.events.on('opened', () => {
    // Run every 10 minutes
    timerData.timerId = setTimeout(giveAway, 10_000)
    observables.connected = true
  })
  client.events.on('messageSending', ({ address, senderAddress, index, items, outpoints, transactions, previousHash }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints: toRaw(outpoints), transactions, previousHash })
  })
  client.events.on('messageSendError', ({ address, senderAddress, index, items, outpoints, transactions, previousHash }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints: toRaw(outpoints), transactions, previousHash, status: 'error' })
  })
  client.events.on('messageSent', ({ address, senderAddress, index, items, outpoints, transactions, previousHash }) => {
    store.commit('chats/sendMessageLocal', { address, senderAddress, index, items, outpoints: toRaw(outpoints), transactions, previousHash, status: 'confirmed' })
  })
  client.events.on('receivedMessage', ({ outbound, copartyAddress, copartyPubKey, index, message, ...args }) => {
    store.dispatch('chats/receiveMessage', { outbound, copartyAddress, copartyPubKey, index, message, ...args })
    if (outbound) {
      return
    }
    const { serverTime, items } = message
    const lastRead = store.getters['chats/lastRead'](copartyAddress)
    const { rewards, totalValue } = store.getters['chats/getFractions'](timePeriod)

    store.commit('chats/readAll', copartyAddress)
    if ((lastRead && serverTime < lastRead) || serverTime <= Date.now() - 10000) {
      return
    }
    const contactsMap = store.getters['contacts/getContacts']
    const senderContact = contactsMap[copartyAddress]
    const sendName = path(['profile', 'name'], senderContact)

    const displayCoParty = toDisplayAddress(copartyAddress)
    const messageHeader = sendName === 'Loading...'
      ? `*[${displayCoParty}](#/chat/${displayCoParty})*`
      : `[**${path(['profile', 'name'], senderContact)
      }**](#/chat/${displayCoParty})`

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
    )
      .sort(([, contactAFraction], [, contactBFraction]) => (contactBFraction || 0) - (contactAFraction || 0))

    const totalAmountReceived = Math.trunc((message.stampValue) * (1 - margin))
    let amountLeft = totalAmountReceived
    for (const [contact, fraction] of sortedContacts) {
      if (Number.isNaN(fraction) || !fraction) {
        console.log(`Skipping ${contact}`)
        continue
      }
      if (contact === copartyAddress) {
        // Don't echo messages
        continue
      }
      const maybeStampAmount = Math.trunc(amountLeft * fraction)
      const stampAmount = maybeStampAmount < minimumStampAmount ? Math.max(amountLeft, minimumStampAmount) : maybeStampAmount
      amountLeft -= stampAmount
      client.sendMessageImpl({ address: contact, items: newItems, stampAmount: Math.min(stampAmount, minimumStampAmount) })
    }
  })

  return { client, observables }
}
