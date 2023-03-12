// This is just an example,
// so you can safely delete all default props below

export default {
  agree: "D'accord",
  chat: {
    donationMessage:
      "Merci de participer à notre vision du futur des communications. Merci de considérer contribuer en envoyant une donation en BCH à l'adresse suivante : bitcoincash:qq7vt04md0pt6fk5szhcx4cgsfuzmppy5u4hxshr4a",
  },
  chatInput: {
    giveLotusSecretly: 'Donner des lotus secrêtement',
    attachImage: 'Attacher une image',
    placeHolder: 'Ecrire un message...',
    emojiPickerTitle: 'Choisir un emoji',
    stampPrice: 'Prix du timbre',
  },
  chatList: {
    noContactMessage: 'Add contacts from the drawer above...', //----
    balance: 'Crédit',
    directMessages: 'Messages privés',
  },
  chatMessage: {
    noPayloadFound: 'Impossible de trouver les données pour ce message',
  },
  chatRightDrawer: {
    stampPrice: 'Prix du timbre',
    sendLotus: 'Envoyer des Lotus',
    notifications: 'Notifications',
  },
  sendLotusDialog: {
    sendLotusTo: 'Envoyer des Lotus à',
    amountHint: 'Combien de Lotus voulez vous transmettre.',
    amountPlaceholder: 'Entrez le nombre de Lotus...',
    memoHint: 'Ajouter un mémo au paiement.',
    memoPlaceholder: 'Entrez le texte...',
    sendBtnLabel: 'Envoyer',
    cancelBtnLabel: 'Annuler',
  },
  sendFileDialog: {
    sendFile: 'Envoyer un fichier',
    captionHint: 'Attacher un memo au fichier.',
    captionPlaceholder: 'Entrez le texte...',
    sendBtnLabel: 'Envoyer',
    cancelBtnLabel: 'Annuler',
  },
  topicDrawer: {
    offering: 'Offre:',
    filter: 'Filtrer:',
  },
  setup: {
    loginOrSignUp: 'Connexion/Inscription',
    welcome: 'Bienvenue',
    welcomeToStampChat: 'StampChat - Bienvenue !',
    eulaDisclaimer:
      'Ce logiciel est un prototype qui peut perdre vos fonds. Gardez les sommes importantes en Lotus dans des logiciels plus mature.',
    eulaYouUnderstand:
      'En cliquant sur "Accepter", vous comprenez que ce logiciel est fourni "Tel quel", sans garantie d\'aucune sorte, explicite ou implicite, y compris, mais sans s\'y limiter, les garanties de qualité marchande, d\'adéquation à un usage particulier et de non-contrefaçon.',
    setupWallet: 'Setup de votre compte', //---- 'Character Setup'
    eula: 'Contrat de licence',
    deposit: 'Deposer des Lotus',
    settings: 'Paramètres',
    back: 'Retour',
    seedWarning:
      'Ne perdez jamais votre phrase de passe car vous ne seriez plus en mesure de récupérer ce compte.',
    searchingRelay: 'Recherche des relais...',
    networkErrorRelayDied: 'Erreur réseau: Le serveur relais ne réponds plus.',
    networkErrorRelayUnexpected:
      'Erreur réseau: Le serveur a généré une erreur inattendue.',
    requestingPayment: 'En attente de paiement...', //?
    sendingPayment: 'Envoi du paiement...',
    uploadingMetaData: 'Téléchargement des metadonnées...',
    openingInbox: 'Ouverture de la boite de réception...',
    profileImageLargeError:
      "L'image de votre avatar est trop volumineuse, choisissez en une plus petite.",
    continue: 'Continuer',
    finish: 'Finir',
    generatingWallet: 'Generation de votre wallet...',
    gatheringBalances: 'Récupération du solde...',
    watchingWallet: 'Surveillance du wallet...', //?
    searchingExistingMetaData: 'Recherche des métadonnées dans le registre...',
    errorContactRegistry: 'Impossible de se connecter au registre',
    accountSetupNext: 'Suivant',
    depositStepNext: 'Suivant',
  },
  accountStep: {
    newAccount: 'Nouveau compte',
    importAccount: 'Importer un compte',
  },
  newContactDialog: {
    newContact: 'Nouveau contact',
    enterBitcoinCashAddress: 'Entrez une adresse Lotus...',
    notFound: 'Non trouvé',
  },
  newTopicDialog: {
    newTopic: 'Créer un nouveau topic',
    enterTopic: 'Entrez le nom du topic...',
    topicNameMinLength: 'Minimum 3 caractères',
    topicNameRules:
      'Seuls sont autorisés les caractères alphanumériques et les points',
    add: 'Ajouter',
    cancel: 'Annuler',
  },
  SettingPanel: {
    newContact: 'Nouveau contact',
    contacts: 'Contacts',
    sendBitcoinCash: 'Envoyer des Lotus',
    recieveBitcoinCash: 'Reçevoir des Lotus',
    profile: 'Profil',
    settings: 'Configuration',
    wipeAndSave: 'Consolidation du portefeuille',
    changeLog: 'Changelog',
    showSeed: 'Montrer la phrase de passe',
  },
  receiveBitcoinDialog: {
    walletStatus: 'Etat du wallet',
    addressCopied: 'Adresse copiée dans le presse papier',
  },
  sendAddressDialog: {
    sendToAddress: "Envoyer vers l'adresse",
    enterBitcoinCashAddress: "Saisissez l'adresse de destination...",
    enterAmount: 'Saisissez le montant (Lotus)',
    cancel: 'Annuler',
    send: 'Envoyer',
  },
  contactBookDialog: {
    contacts: 'Contacts',
    search: 'Recherche...',
  },
  contactItem: {
    address: 'Adresse',
    inboxPrice: 'Prix du timbre', //?Inbox Price
    notFound: 'Non trouvé',
  },
  settings: {
    appearance: 'Apparence',
    networking: 'Réseau',
    contactRefreshInterval:
      'Fréquence de rafraîchissement des contacts (minutes)',
    contactRefreshIntervalHint:
      'Intervalle entre mise à jour des contacts (minutes)', //? Interval between contact updates (minutes)
    darkMode: 'Mode Nuit/Sombre',
    saveSettings: 'Enregistrer',
    cancelSettings: 'Annuler',
    languageSelectorCaption: 'Langue',
  },
  profile: {
    name: 'Pseudonyme',
    seedEntry: 'Phrase de passe',
    importSeed: 'Rappel des mémoires perdues', //? Recover past memories
    invalidSeed: 'Phrase de passe invalide...',
    nameHint: 'Identifiant tel que vu par vos correspondants',
    enterSeed: 'Entrez votre phrase de passe...',
    pleaseType: "Soyez plus créatif, s'il vous plait",
    bio: 'Biographie',
    bioHint: 'Courte biographie telle que vue par vos correspondants',
    uploadAvatar: 'Télécharger un avatar',
  },
  clearHistoryDialog: {
    cancel: 'Annuler',
    clear: 'Clear',
    message:
      "Êtes-vous sûr de vouloir effacer tout l'historique des discussions avec",
  },
  deleteChatDialog: {
    cancel: 'Annuler',
    delete: 'Effacer',
    message:
      "Êtes-vous sûr de vouloir effacer tout l'historique des discussions avec",
  },
  deleteMessageDialog: {
    cancel: 'Annuler',
    delete: 'Effacer',
    message: 'Etes vous sûr de vouloir effacer ce message ?',
  },

  profileDialog: {
    cancel: 'Annuler',
    update: 'Mettre à jour',
    avatarTooLarge:
      "L'image de votre avatar est trop volumineuse, choisissez en une plus petite.",
    unableContactRelay: 'Impossible de contacter le serveur-relai.',
    pushingProfile: 'Envoi du nouveau profil..',
    profile: 'Profil',
  },
  wipeWallet: {
    warning: 'ATTENTION!',
    warningMsg:
      'Cette opération va effacer tous les messages du serveur et consolider les fonds associés dans votre wallet (celui dont vous avez la phrase de passe)',
    cannotBeUndone: 'Cette opération ne peut pas être annulée !',
    cancel: 'Annuler',
    wipe: 'Effacer tout le contenu distant', //?Wipe All Remote Content
    spinnerText: 'Effacer tous les messages',
  },
  seedPhraseDialog: {
    seedPhrase: 'Phrase de passe',
  },
  transactionDialog: {
    backingTransactions: 'Transactions',
    txId: 'Transaction ID',
    txType: 'Type',
    txAddress: 'Adresse',
    txAmount: 'Montant',
  },
  close: 'Fermer',
}
