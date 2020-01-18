const cashlib = require('bitcore-lib-cash')

export default {
  namespaced: true,
  state: {
    complete: false,
    xPrivKey: null,
    identityPrivKey: null,
    addresses: {},
    totalBalance: 0
  },
  mutations: {
    completeSetup (state) {
      state.complete = true
    },
    reset (state) {
      state.xPrivKey = null
      state.identityPrivKey = null
      state.addresses = {}
      state.totalBalance = 0
    },
    setAddress (state, { address, balance, privKey }) {
      if (state.addresses[address] == null) {
        state.totalBalance += balance
      } else {
        let oldBalance = state.addresses[address].balance
        state.totalBalance += balance - oldBalance
      }
      state.addresses[address] = { balance, privKey }
    },
    updateBalance (state, { address, balance }) {
      if (state.addresses[address] != null) {
        let oldBalance = state.addresses[address].balance
        state.addresses[address].balance = balance
        state.totalBalance += balance - oldBalance
      }
    },
    setXPrivKey (state, xPrivKey) {
      state.xPrivKey = xPrivKey
      state.identityPrivKey = xPrivKey.deriveChild(20102019)
        .deriveChild(0, true)
        .privateKey // TODO: Proper path for this
    },
    reinitialize (state) {
      if (state.xPrivKey != null) {
        state.xPrivKey = cashlib.HDPrivateKey.fromObject(state.xPrivKey)
        state.identityPrivKey = cashlib.PrivateKey.fromObject(state.identityPrivKey)
      }
    }
  },
  actions: {
    completeSetup ({ commit }) {
      commit('completeSetup')
    },
    reset ({ commit }) {
      commit('reset')
    },
    reinitialize ({ commit }) {
      commit('reinitialize')
    },
    // TODO: Set callbacks
    setXPrivKey ({ commit }, xPrivKey) {
      commit('setXPrivKey', xPrivKey)
    },
    async updateBalance ({ commit, rootGetters }, address) {
      let handler = rootGetters['electrumHandler/getClient']
      let balanceJson = await handler.blockchainAddress_getBalance(address)
      let balance = balanceJson.confirmed + balanceJson.unconfirmed
      commit('updateBalance', { address, balance })
    },
    async updateBalances ({ commit, rootGetters, getters }) {
      let addresses = getters['getAddresses']
      for (var addr in addresses) {
        let handler = rootGetters['electrumHandler/getClient']
        let balanceJson = await handler.blockchainAddress_getBalance(addr)
        let balance = balanceJson.confirmed + balanceJson.unconfirmed
        commit('updateBalance', { addr, balance })
      }
    },
    async updateAddresses ({ commit, rootGetters, getters }) {
      let client = rootGetters['electrumHandler/getClient']
      let xPrivKey = getters['getXPrivKey']
      for (var i = 0; i < 2; i++) {
        let privKey = xPrivKey.deriveChild(44)
          .deriveChild(0)
          .deriveChild(0)
          .deriveChild(i, true)
          .privateKey
        let address = privKey.toAddress('testnet').toLegacyAddress()
        let balanceJson = await client.blockchainAddress_getBalance(address)
        let balance = balanceJson.confirmed + balanceJson.unconfirmed
        commit('setAddress', { address, balance, privKey })
      }
    },
    async startListeners ({ dispatch, getters, rootGetters }) {
      let client = rootGetters['electrumHandler/getClient']
      await client.subscribe.on(
        'blockchain.address.subscribe',
        async (result) => {
          let address = result[0]
          await dispatch('updateBalance', address)
        })
      let addresses = getters['getAddresses']
      for (var addr in addresses) {
        await client.blockchainAddress_subscribe(addr)
      }
    },
    clearWallet ({ commit }) {
      commit('setAddresses', {})
    }
  },
  getters: {
    isSetupComplete (state) {
      return state.complete
    },
    getBalance (state) {
      return state.totalBalance
    },
    getIdentityPrivKey (state) {
      return state.identityPrivKey
    },
    getPaymentAddress: (state) => (seqNum) => {
      if (state.xPrivKey !== null) {
        let privkey = state.xPrivKey.deriveChild(44)
          .deriveChild(0)
          .deriveChild(0)
          .deriveChild(seqNum, true)
        return privkey.toAddress('testnet')
      } else {
        return null
      }
    },
    getMyAddress (state) {
      return state.identityPrivKey.toAddress(
        'testnet') // TODO: Not just testnet
    },
    getMyAddressStr (state) {
      console.log(state)
      return state.identityPrivKey.toAddress('testnet')
        .toCashAddress() // TODO: Not just testnet
    },
    getAddresses (state) {
      return state.addresses
    },
    getXPrivKey (state) {
      return state.xPrivKey
    }
  }
}
