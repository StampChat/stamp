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
    async updateBalance ({ commit }, address) {
      let balanceJson =
          await this.state.electrumHandler.client.blockchainAddress_getBalance(
            address)
      let balance = balanceJson.confirmed + balanceJson.unconfirmed
      commit('updateBalance', { address, balance })
    },
    async updateBalances ({ commit }) {
      for (var addr in this.addresses) {
        let balanceJson = await this.state.electrumHandler.client
          .blockchainAddress_getBalance(addr)
        let balance = balanceJson.confirmed + balanceJson.unconfirmed
        commit('updateBalance', { addr, balance })
      }
    },
    async updateAddresses ({ commit }) {
      let client = this.state.electrumHandler.client
      for (var i = 0; i < 2; i++) {
        let privKey = this.state.wallet.xPrivKey.deriveChild(44)
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
    async startListeners ({ dispatch }) {
      let client = this.state.electrumHandler.client
      await client.subscribe.on(
        'blockchain.address.subscribe',
        async (result) => {
          let address = result[0]
          await dispatch('updateBalance', address)
        })
      for (var addr in this.state.wallet.addresses) {
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
    getPaymentAddress:
        (state) => (seqNum) => {
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
      return state.identityPrivKey.toAddress('testnet')
        .toCashAddress() // TODO: Not just testnet
    },
    getAddresses (state) {
      return state.addresses
    }
  }
}
