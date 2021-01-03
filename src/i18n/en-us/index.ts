// This is just an example,
// so you can safely delete all default props below

export default {
  chat: {
    announcementName: 'Stamp Developers',
    donationMessage: 'Thank you for participating in our vision of the future of online communications. Please consider donating to our efforts by sending real BCH to bitcoincash:qq7vt04md0pt6fk5szhcx4cgsfuzmppy5u4hxshr4a'
  },
  chatInput: {
    placeHolder: 'Write a message...',
    emojiPickerTitle: 'Select an emoji'
  },
  chatList: {
    noContactMessage: 'Add contacts from the drawer above...',
    balance: 'Balance'
  },
  setup: {
    welcome: 'Welcome',
    setupWallet: 'Setup Account',
    deposit: 'Deposit Funds',
    chooseRelay: 'Choose a relay server',
    setupProfile: 'Setup Profile',
    settings: 'Settings',
    back: 'Back',
    searchingRelay: 'Searching for existing relay data...',
    networkErrorRelayDied: 'Network Error: Relay server connection died. ',
    networkErrorRelayUnexpected: 'Network error: Relay disconnnected unexpectedly.',
    requestingPayment: 'Requesting Payment...',
    sendingPayment: 'Sending Payment...',
    uploadingMetaData: 'Uploading Metadata...',
    openingInbox: 'Opening Inbox...',
    profileImageLargeError: 'Profile image is too large, select a smaller image.',
    continue: 'Continue',
    finish: 'Finish',
    unkown: 'Unkown',
    newWallet: 'New Wallet',
    importWallet: 'Import Wallet',
    generatingWallet: 'Generating wallet...',
    gatheringBalances: 'Gathering balances...',
    watchingWallet: 'Watching wallet...',
    searchingExistingMetaData: 'Searching for existing keyserver metadata...',
    errorContactKeyServer: 'Unable to contact keyserver'
  },
  newContactDialog: {
    newContact: 'New Contact',
    enterBitcoinCashAddress: 'Enter Bitcoin Cash address...',
    notFound: 'Not Found',
    minimumStamp: 'Minimum Stamp'
  },
  SettingPanel: {
    newContact: 'New Contact',
    contacts: 'Contacts',
    sendBitcoinCash: 'Send Bitcoin Cash',
    recieveBitcoinCash: 'Receive Bitcoin Cash',
    profile: 'Profile',
    settings: 'Settings'
  },
  receiveBitcoinDialog: {
    walletStatus: 'Wallet Status',
    showSeed: 'ShowSeed',
    close: 'Close',
    addressCopied: 'Address copied to clipboard'
  },
  sendAddressDialog: {
    sendToAddress: 'Send to Address',
    enterBitcoinCashAddress: 'Enter Bitcoin Cash address...',
    enterAmount: 'Enter Amount',
    cancel: 'Cancel',
    send: 'Send'
  },
  contactBookDialog: {
    contacts: 'Contacts',
    search: 'Search...',
    close: 'Close'
  },
  contactItem: {
    address: 'Address',
    inboxPrice: 'Inbox Price',
    notFound: 'Not Found'
  },
  settings: {
    appearance: 'Appearance',
    networking: 'Networking',
    contactRefreshInterval: 'Contact Refresh Interval *',
    contactRefreshIntervalHint: 'Interval between contact updates',
    darkMode: 'Dark Mode'
  },
  profile: {
    name: 'Enter your display name...',
    seedEntry: 'Your password (Seed)...',
    invalidSeed: 'Invalid seed phrase...',
    nameHint: 'Name displayed to others',
    enterSeed: 'Enter a seed phrase...',
    pleaseType: 'Please type something',
    bio: 'Bio',
    bioHint: 'Short biolography displayed to others',
    minimumStamp: 'Minimum Stamp *',
    minimumStampHint: 'The minimum fee required for strangers to message you',
    minimumStampRule: 'Please input an inbox fee',
    uploadAvatar: 'Upload Avatar'
  },
  clearHistoryDialog: {
    cancel: 'Cancel',
    clear: 'Clear',
    message: 'Are you sure you want to clear all chat history with'
  },
  deleteChatDialog: {
    cancel: 'Cancel',
    delete: 'Delete',
    message: 'Are you sure you want to delete all chat history with'
  },
  deleteMessageDialog: {
    cancel: 'Cancel',
    delete: 'Delete',
    message: 'Are you sure you want to delete this message?'
  },
  imageDialog: {
    close: 'Close'
  },
  profileDialog: {
    cancel: 'Cancel',
    update: 'Update',
    avatarTooLarge: 'Profile avatar is too large, select a smaller image.',
    unableContactRelay: 'Unable to contact relay server.',
    pushingProfile: 'Pushing new Profile...'
  },
  seedPhraseDialog: {
    seedPhrase: 'Seed Phrase',
    close: 'Close'
  }
}
