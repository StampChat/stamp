export const chronikServers = [{ url: 'https://chronik.be.cash/xpi' }]

// The separation here is due the fork. Not all backends support the new network prefixes yet
// So we are using the legacy prefixes everywhere for API calls, but using
// the ecash prefix for display
export const networkName = 'cash-livenet'
export const displayNetwork = 'livenet'

// Wallet constants
export const numAddresses = 10
export const numChangeAddresses = 10
export const recomendedBalance = 500_000
export const nUtxoGoal = 10
export const feeUpdateTimerMilliseconds = 60_000
export const defaultFeePerByte = 2

// Registry constants
export const registrys = ['https://mainnet-registry.cashweb.io']

// Relay constants
export const pingTimeout = 20_000
export const relayReconnectInterval = 10_000
export const defaultAcceptancePrice = 100
export const defaultRelayUrl = 'https://mainnet-relay.cashweb.io'
export const relayUrlOptions = ['https://mainnet-relay.cashweb.io']
export const defaultRelayData: {
  profile: {
    name: string
    bio: string
    avatar: string
    pubKey?: Uint8Array
  }
  inbox: {
    acceptancePrice?: number
  }
  notify: boolean
} = {
  profile: {
    name: '',
    bio: '',
    avatar: '',
  },
  inbox: {
    acceptancePrice: defaultAcceptancePrice,
  },
  notify: true,
}
export const pendingRelayData = {
  profile: {
    name: 'Loading...',
    bio: '',
    avatar: '',
  },
  inbox: {
    acceptancePrice: NaN,
  },
  notify: true,
  lastUpdateTime: 0,
}

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
    name: 'Give Lotus Chat',
    address: 'lotus_16PSJJK5XfnDCV3sdi3BsgDTa1dS4xezFuH6duwbo',
  },
  {
    name: 'Shammah',
    address: 'lotus_16PSJPAVocAM5behRWxqwQnpEVRPJrV4XxbthBhJR',
  },
]

// Notification constants
export const notificationTimeout = 4000

// Contact defaults
export const defaultUpdateInterval = 1000 * 60 * 60 * 1 * 1

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('salt')
