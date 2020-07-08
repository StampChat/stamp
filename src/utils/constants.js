// Electrum constants
export const electrumServers = [
  {
    electrumURL: 'testnet.bitcoincash.network',
    electrumPort: 60_002
  },
  {
    electrumURL: 'electroncash.de',
    electrumPort: 50_004
  },
  {
    electrumURL: 'fulcrum-testnet.bchjs.cash',
    electrumPort: 50_002
  },
  {
    electrumURL: 'blackie.c3-soft.com',
    electrumPort: 60_002
  }
]
export const electrumPingInterval = 10_000

// Wallet constants
export const numAddresses = 10
export const numChangeAddresses = 10
export const recomendedBalance = 500_000
export const nUtxoGoal = 10
export const feeUpdateTimerMilliseconds = 60_000
export const defaultFeePerByte = 2

// Keyserver constants
export const trustedKeyservers = ['https://keyserver.cashweb.io']

// Relay constants
export const pingTimeout = 20_000
export const relayReconnectInterval = 10_000
export const defaultAcceptancePrice = 100
export const defaultRelayUrl = 'relay.cashweb.io'
export const relayUrlOptions = ['relay.cashweb.io']
export const defaultRelayData = {
  profile: {
    name: '',
    bio: null,
    avatar: null,
    pubKey: null
  },
  inbox: {
    acceptancePrice: defaultAcceptancePrice
  },
  notify: true
}
export const pendingRelayData = {
  profile: {
    name: 'Loading...',
    bio: null,
    avatar: null,
    pubKey: null
  },
  inbox: {
    acceptancePrice: NaN
  },
  notify: true
}

// Avatar constants
export const defaultAvatars = ['bunny_cyborg.png', 'croc_music.png', 'kitty_standard.png', 'panda_ninja.png', 'dog_posh.png']

// Chat constants
export const defaultStampAmount = 5000
export const donationMessage = 'Thank you for participating in our vision of the future of online communications. Please consider donating to our efforts by sending real BCH to bitcoincash:qq7vt04md0pt6fk5szhcx4cgsfuzmppy5u4hxshr4a'

// Notification constants
export const notificationTimeout = 4000

// Contact defaults
export const defaultUpdateInterval = 60 * 10 * 1_000

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('salt')
