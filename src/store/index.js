import Vue from 'vue'
import Vuex from 'vuex'
import client from '../keyserver/client'
import addressmetadata from '../keyserver/addressmetadata_pb'
import VCard from 'vcf'
import VuexPersistence from 'vuex-persist'

const cashlib = require('bitcore-lib-cash')

Vue.use(Vuex)

const vuexLocal = new VuexPersistence({
  storage: window.localStorage
})

export default new Vuex.Store({
  modules: {
    myDrawer: {
      namespaced: true,
      state: {
        drawerOpen: false
      },
      mutations: {
        toggleDrawerOpen (state) {
          state.drawerOpen = !state.drawerOpen
        },
        setDrawerOpen (state, val) {
          state.drawerOpen = val
        }
      },
      getters: {
        getDrawerOpen (state) {
          return state.drawerOpen
        }
      },
      actions: {
        toggleDrawerOpen ({ commit }) {
          commit('toggleDrawerOpen')
        },
        setDrawerOpen ({ commit }, val) {
          commit('setDrawerOpen', val)
        }
      }
    },
    contactDrawer: {
      namespaced: true,
      state: {
        drawerOpen: false
      },
      mutations: {
        toggleDrawerOpen (state) {
          state.drawerOpen = !state.drawerOpen
        },
        setDrawerOpen (state, val) {
          state.drawerOpen = val
        }
      },
      getters: {
        getDrawerOpen (state) {
          return state.drawerOpen
        }
      },
      actions: {
        toggleDrawerOpen ({ commit }) {
          commit('toggleDrawerOpen')
        },
        setDrawerOpen ({ commit }, val) {
          commit('setDrawerOpen', val)
        }
      }
    },
    chats: {
      namespaced: true,
      state: {
        order: ['qrtwst5ggcw59g8yk0x3qj4g5qdt28frts0g526x6g', 'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs'],
        activeChatAddr: 'qrtwst5ggcw59g8yk0x3qj4g5qdt28frts0g526x6g',
        data: {
          'qrtwst5ggcw59g8yk0x3qj4g5qdt28frts0g526x6g': {
            messages: [
              {
                'outbound': false,
                'sent': true,
                'body': 'hello there',
                'timestamp': 1570890706
              },
              {
                'outbound': true,
                'sent': true,
                'body': 'howdy',
                'timestamp': 1570890736
              }
            ]
          },
          'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
            messages: [
              {
                'outbound': true,
                'sent': true,
                'body': 'Calin yooo',
                'timestamp': 1570890006
              },
              {
                'outbound': false,
                'sent': true,
                'body': 'whats up bro',
                'timestamp': 1570890736
              }
            ]
          }
        }
      },
      getters: {
        getChatOrder (state) {
          return state.order
        },
        getActiveChat (state) {
          return state.activeChatAddr
        },
        getLatestMessageBody: (state) => (addr) => {
          return state.data[addr].messages[state.data[addr].messages.length - 1].body
        },
        getAllMessages: (state) => (addr) => {
          return state.data[addr].messages
        }
      },
      mutations: {
        switchChatActive (state, addr) {
          state.activeChatAddr = addr
        },
        sendMessage (state, { addr, text }) {
          let newMsg = {
            'outbound': true,
            'sent': false,
            'body': text,
            'timestamp': Math.floor(Date.now() / 1000)
          }
          state.data[addr].messages.push(newMsg)
        },
        switchOrder (state, addr) {
          state.order.splice(state.order.indexOf(addr), 1)
          state.order.unshift(addr)
        },
        clearChat (state, addr) {
          state.data[addr].messages = []
        }
      },
      actions: {
        switchChatActive ({ commit }, addr) {
          commit('switchChatActive', addr)
        },
        sendMessage ({ commit }, { addr, text }) {
          commit('sendMessage', { addr, text })
        },
        switchOrder ({ commit }, addr) {
          commit('switchOrder', addr)
        },
        clearChat ({ commit }, addr) {
          commit('clearChat', addr)
        }
      }
    },
    keyserverHandler: {
      namespaced: true,
      state: {
        handler: new client.Handler()
      },
      mutations: {
        setHandler (state, handler) {
          state.handler = handler
        }
      },
      actions: {
        setHandler ({ commit }, handler) {
          commit('setHandler', handler)
        }
      },
      getters: {
        getHandler (state) {
          return state.handler
        }
      }
    },
    wallet: {
      namespaced: true,
      state: {
        xPrivKey: null,
        identityPrivKey: null,
        addresses: {},
        totalBalance: 0
      },
      mutations: {
        setAddresses (state, addresses) {
          // TODO: Recalc balance
          state.addresses = addresses
        },
        setAddress (state, pair) {
          let oldBalance = state.addresses[pair.address]
          let newBalance = pair.balance
          state.addresses[pair.address] = newBalance
          if (oldBalance == null) {
            state.totalBalance = newBalance
          } else {
            state.totalBalance += newBalance - oldBalance
          }
        },
        setXPrivKey (state, xPrivKey) {
          state.xPrivKey = xPrivKey
          state.identityPrivKey = xPrivKey.deriveChild(20102019).deriveChild(0, true).privateKey // TODO: Proper path for this
        },
        reinitialize (state) {
          if (state.xPrivKey != null) {
            state.xPrivKey = cashlib.HDPrivateKey.fromObject(state.xPrivKey)
            state.identityPrivKey = cashlib.PrivateKey.fromObject(state.identityPrivKey)
          }
        }
      },
      actions: {
        reinitialize ({ commit }) {
          commit('reinitialize')
        },
        // TODO: Set callbacks
        setXPrivKey ({ commit }, xPrivKey) {
          commit('setXPrivKey', xPrivKey)
        },
        async updateBalance ({ commit }, address) {
          let balanceJson = await this.state.electrumHandler.client.blockchainAddress_getBalance(address)
          let balance = balanceJson.confirmed + balanceJson.unconfirmed
          let pair = { 'address': address, 'balance': balance }
          commit('setAddress', pair)
        },
        async updateBalances ({ commit }) {
          for (var addr in this.addresses) {
            let balanceJson = await this.state.electrumHandler.client.blockchainAddress_getBalance(addr)
            let balance = balanceJson.confirmed + balanceJson.unconfirmed
            let pair = { 'address': addr, 'balance': balance }
            commit('setAddress', pair)
          }
        },
        async updateAddresses ({ commit }) {
          let client = this.state.electrumHandler.client
          var i
          for (i = 0; i < 16; i++) {
            let addr = this.state.wallet.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(i, true).privateKey.toAddress('testnet').toLegacyAddress()
            let balanceJson = await client.blockchainAddress_getBalance(addr)
            let balance = balanceJson.confirmed + balanceJson.unconfirmed
            let pair = { 'address': addr, 'balance': balance }
            commit('setAddress', pair)
          }
        },
        async startListeners ({ commit, dispatch }) {
          let client = this.state.electrumHandler.client
          await client.subscribe.on('blockchain.address.subscribe', async (result) => {
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
        getBalance (state) {
          return state.totalBalance
        },
        getIdentityPrivKey (state) {
          return state.identityPrivKey
        },
        getPaymentAddress: (state) => (seqNum) => {
          if (state.xPrivKey !== null) {
            let privkey = state.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(seqNum, true)
            return privkey.toAddress('testnet')
          } else {
            return null
          }
        },
        getMyAddress (state) {
          console.log('priv key')
          console.log(state.identityPrivKey)
          return state.identityPrivKey.toAddress('testnet')
        }
      }
    },
    electrumHandler: {
      namespaced: true,
      state: {
        client: null,
        connected: false
      },
      mutations: {
        setClient (state, client) {
          state.client = client
        },
        setConnected (state, connected) {
          state.connected = connected
        }
      },
      actions: {
        setConnected ({ commit }, connected) {
          commit('setConnected', connected)
        },
        setClient ({ commit, dispatch }, client) {
          client.connect().then(() => {
            dispatch('setConnected', true)
          }).catch(() => dispatch('setConnected', false))
          commit('setClient', client)
        }
      },
      getters: {
        getClient (state) {
          return state.client
        },
        connected (state) {
          return state.connected
        }
      }
    },
    contacts: {
      namespaced: true,
      state: {
        profiles: {
          'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
            'name': 'Shammah'
          },
          'qrtwst5ggcw59g8yk0x3qj4g5qdt28frts0g526x6g': {
            'name': 'Calin'
          }
        }
      },
      getters: {
        getProfile: (state) => (addr) => {
          return state.profiles[addr]
        }
      },
      mutations: {
        updateProfile (state, { addr, profile }) {
          state.profiles[addr] = profile
        }
      },
      actions: {
        startProfileUpdater ({ commit }) {
          setInterval(() => {
            for (let addr in this.state.contacts.profiles) {
              // Make this generic over networks
              // Batch this
              this.state.keyserverHandler.handler.uniformSample(`bchtest:${addr}`).then(function (metadata) {
                let payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

                function isVCard (entry) {
                  return entry.getKind() === 'vcard'
                }

                let entryList = payload.getEntriesList()

                let rawCard = entryList.find(isVCard).getEntryData()
                let strCard = new TextDecoder().decode(rawCard)

                let vCard = new VCard().parse(strCard)

                let profile = {
                  'name': vCard.data.fn._data
                }
                commit('updateProfile', { addr, profile })
              })
            }
          }, 1000)
        }
      }
    },
    myProfile: {
      namespaced: true,
      state: {
        name: null,
        bio: null,
        avatar: null
      },
      getters: {
        getMyProfile (state) {
          let profile = {
            'name': state.name,
            'address': state.address
          }
          return profile
        }
      },
      mutations: {
        setMyProfile (state, profile) {
          state.name = profile.name
          state.address = profile.address
          state.avatar = profile.avatar
        }
      },
      actions: {
        setMyProfile ({ commit }, profile) {
          commit('setMyProfile', profile)
        }
      }
    },
    splitter: {
      state: {
        splitterRatio: 40
      },
      mutations: {
        setSplitterRatio (state, ratio) {
          state.splitterRatio = ratio
        }
      },
      getters: {
        getSplitterRatio (state) {
          return state.splitterRatio
        }
      },
      actions: {
        setSplitterRatio ({ commit }, val) {
          commit('setSplitterRatio', val)
        }
      }
    },
    clock: {
      state: {
        now: Date.now()
      },
      mutations: {
        updateClock (state) {
          state.now = Date.now()
        }
      },
      actions: {
        startClock ({ commit }) {
          setInterval(() => {
            commit('updateClock')
          }, 1000)
        },
        updateClock ({ commit }) {
          commit('updateClock')
        }
      },
      getters: {
        getUnixTime (state) {
          return state.now
        }
      }
    }
  },
  plugins: [vuexLocal.plugin]
})
