export const minSplitter = 20
export const maxSplitter = 75

// Electrum constants
export const electrumURL = 'testnet.bitcoincash.network'
export const electrumPort = 60002
export const electrumPingInterval = 10_000

// Wallet constants
export const numAddresses = 10
export const numChangeAddresses = 10
export const recomendedBalance = 2_000
export const nUtxoGoal = 10
export const feeUpdateTimerMilliseconds = 60_000
export const defaultFeePerByte = 2

// Relay constants
export const pingTimeout = 20_000
export const relayReconnectInterval = 10_000
export const defaultAcceptancePrice = 100
export const defaultRelayUrl = '34.68.170.199:8531'
export const relayUrlOptions = ['34.68.170.199:8531']
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

// Chat constants
export const defaultStampAmount = 5000
export const donationMessage = 'Thank you for participating in our vision of the future of online communications. Please consider donating to our efforts by sending real BCH to bitcoincash:qq7vt04md0pt6fk5szhcx4cgsfuzmppy5u4hxshr4a'

// Notification constants
export const notificationTimeout = 4000

// Contact defaults
export const defaultUpdateInterval = 60 * 10 * 1_000
