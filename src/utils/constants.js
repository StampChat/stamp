
import { ElectrumTransport } from 'electrum-cash'

// Electrum constants
export const electrumServers = [
  // Our mainnet server, we need to setup a testnet server as well.
  // {
  //   url: 'fulcrum.cashweb.io',
  //   port: 443,
  //   scheme: ElectrumTransport.WSS.Scheme
  // }
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
  //   port: 60004,
  //   scheme: ElectrumTransport.WSS.Scheme
  // },
  {
    url: 'telectrum.bitcoinabc.org',
    port: 60006,
    scheme: ElectrumTransport.WS.Scheme
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
export const defaultRelayUrl = 'https://relay.cashweb.io'
export const relayUrlOptions = ['https://relay.cashweb.io']
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
    name: 'Stamp Group Chat #1',
    address: 'bchtest:qrugj9hv6lcar6hflk26yz8k9qq8wp9tvsmvvqqwgq',
    pubkey: new Uint8Array([2, 111, 154, 97, 51, 91, 21, 201, 249, 21, 64, 33, 209, 44, 71, 187, 52, 83, 161, 168, 20, 173, 139, 235, 85, 155, 234, 247, 223, 107, 31, 88, 32])
  },
  {
    name: 'Harry',
    address: 'bchtest:qq3q7kzdds2xuzug05tn7w3lp7kkfulqfsf85x8tty',
    pubkey: new Uint8Array([3, 14, 10, 67, 80, 209, 189, 177, 180, 42, 144, 28, 56, 182, 94, 167, 89, 227, 104, 46, 174, 234, 241, 72, 197, 63, 184, 232, 181, 16, 198, 7, 191])
  },
  {
    name: 'Shammah',
    address: 'bchtest:qqu3vqt9hydcmhkydn9h68qzlyduypuwqgnc8vvjhc',
    pubkey: new Uint8Array([2, 102, 255, 22, 228, 132, 236, 1, 167, 197, 242, 26, 230, 200, 60, 103, 197, 225, 249, 140, 125, 104, 196, 130, 160, 242, 40, 178, 73, 218, 99, 238, 38])
  }
]

// Notification constants
export const notificationTimeout = 4000

// Contact defaults
export const defaultUpdateInterval = 60 * 10 * 1_000

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('salt')
