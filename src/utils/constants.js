
import { ElectrumTransport } from 'electrum-cash'

// Electrum constants
export const electrumServers = [
  // Our mainnet server, we need to setup a testnet server as well.
  {
    url: 'fulcrum.cashweb.io',
    port: 443,
    scheme: ElectrumTransport.WSS.Scheme
  }
  // {
  //   url: 'electrum.bitcoinabc.org',
  //   port: 50004,
  //   scheme: 'wss'
  // },
  // {
  //   url: 'bchabc.fmarcosh.xyz',
  //   port: 50003,
  //   scheme: ElectrumTransport.WS.Scheme
  // },
  // {
  //   url: 'telectrum.bitcoinabc.org',
  //   port: 60006,
  //   scheme: ElectrumTransport.WS.Scheme
  // },
  // {
  //   url: 'tfulcrum.cashweb.io',
  //   port: 443,
  //   scheme: ElectrumTransport.WSS.Scheme
  // }
]

// The separation here is due the fork. Not all backends support the new network prefixes yet
// So we are using the legacy prefixes everywhere for API calls, but using
// the ecash prefix for display
// export const networkName = 'testnet'
// export const displayNetwork = 'ecash-testnet'
export const networkName = 'mainnet'
export const displayNetwork = 'ecash-mainnet'

export const electrumPingInterval = 10_000

// Wallet constants
export const numAddresses = 10
export const numChangeAddresses = 10
export const recomendedBalance = 5_000_000
export const nUtxoGoal = 10
export const feeUpdateTimerMilliseconds = 60_000
export const defaultFeePerByte = 2

// Keyserver constants
export const trustedKeyservers = ['https://mainnet-keyserver.cashweb.io']

// Relay constants
export const pingTimeout = 20_000
export const relayReconnectInterval = 10_000
export const defaultAcceptancePrice = 100
export const defaultRelayUrl = 'https://mainnet-relay.cashweb.io'
export const relayUrlOptions = ['https://mainnet-relay.cashweb.io']
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
export const defaultContacts = [
  {
    name: 'God',
    address: 'ecash:qznv94fgtyh423yw0hndmzy4lf7a2fv33y7eyv7g99'
  }
]

// Notification constants
export const notificationTimeout = 4000

// Contact defaults
export const defaultUpdateInterval = 60 * 10 * 1_000

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('salt')
