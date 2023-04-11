export const chronikServers = [{ url: 'https://chronik.be.cash/xpi' }]

// The separation here is due the fork. Not all backends support the new network prefixes yet
// So we are using the legacy prefixes everywhere for API calls, but using
// the ecash prefix for display
export const networkName = 'cash-livenet'
export const displayNetwork = 'livenet'

// Wallet constants
export const recomendedBalance = 500_000
export const nUtxoGoal = 10
export const defaultFeePerByte = 2

// Registry constants
export const registrys = ['https://mainnet-keyserver.cashweb.io']

// Relay constants
export const defaultAcceptancePrice = 100
export const defaultRelayUrl = 'https://mainnet-relay.cashweb.io'
export const relayUrlOptions = ['https://mainnet-relay.cashweb.io']

// Avatar constants
export const defaultAvatars = [
  'bunny_cyborg.png',
  'croc_music.png',
  'kitty_standard.png',
  'panda_ninja.png',
  'dog_posh.png',
]

// Chat constants
export const defaultStampAmount = 1_000_000 // Sats
export const stampLowerLimit = 1 // XPI

export const defaultContacts = [
  {
    name: 'Shammah',
    address: 'lotus_16PSJPAVocAM5behRWxqwQnpEVRPJrV4XxbthBhJR',
  },
  {
    name: 'Matthew',
    address: 'lotus_16PSJPFMAXn1VQ7cUwCzHEp7g32JjxocGK8afvGZy',
  },
  {
    name: 'Sean Ballard',
    address: 'lotus_16PSJMijz6kXyfAuHSqW73Dympd2E42n4R3WHFQ6U',
  },
  {
    name: 'Korv',
    address: 'lotus_16PSJQ56Mb2QoBKZKHMfJ4wo7TZ7AUQXxDJkqKfp4',
  },
  {
    name: 'Alex Ugorji',
    address: 'lotus_16PSJPyy31QzuGQNqXq26r3i6GL6QBVR7S9caLxE2',
  },
]

// Contact defaults
export const defaultUpdateInterval = 1000 * 60 * 60 * 1 * 1

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('salt')
