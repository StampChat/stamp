
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
export const networkName = 'mainnet'
export const displayNetwork = 'ecash-mainnet'

export const electrumPingInterval = 10_000

// Wallet constants
export const numAddresses = 10
export const numChangeAddresses = 10
export const recomendedBalance = 500_000
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
export const stampLowerLimit = 1000

export const defaultContacts = [
  {
    name: 'Yoshiyahu',
    address: 'ecash:qrz6dtj4ahlrv67q7hjcqa78tyvcl48f9yasgwwvea'
  },
  {
    name: 'Mengerian',
    address: 'ecash:qrfzkvmk7mrvvh55zyy0q7ksxth6l7xr4sgaspdrj9'
  },
  {
    name: 'deadalnix',
    address: 'ecash:qrnqz2da0xdef8xmcfadyjcqmm0z73nyug4xha2jgj'
  },
  {
    name: 'Marco',
    address: 'ecash:qpd8uqdp6nc4jt6pantt5plj0qqt9m4vdss695azhe'
  },
  {
    name: 'Pierre',
    address: 'ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4'
  },
  {
    name: 'Vin',
    address: 'ecash:qrfv6ws03vlavn5fjls6fhmakfgthrqs3qsmaul0su'
  },
  {
    name: 'Tendo Pein',
    address: 'ecash:qr2sv83tfcqdt6mhfct5mt7ukn5n4p9dmyu97jl454'
  },
  {
    name: 'BytesOfMan',
    address: 'ecash:qqd3qn4zazjhygk5a2vzw2gvqgqwempr4gtfza25mc'
  }
]

// Notification constants
export const notificationTimeout = 4000

// Contact defaults
export const defaultUpdateInterval = 60 * 10 * 1_000

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('salt')
