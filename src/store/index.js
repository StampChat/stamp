import Vue from 'vue'
import Vuex from 'vuex'
import KeyserverHandler from '../keyserver/handler'
import RelayClient from '../relay/client'
import addressmetadata from '../keyserver/addressmetadata_pb'
import VCard from 'vcf'
import VuexPersistence from 'vuex-persist'
import messages from '../relay/messages_pb'

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
        order: [],
        activeChatAddr: null,
        data: {
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
          let nMessages = Object.keys(state.data[addr].messages).length
          if (nMessages !== 0) {
            return state.data[addr].messages[nMessages - 1].body
          } else {
            return ''
          }
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
            outbound: true,
            sent: false,
            body: text,
            timestamp: Math.floor(Date.now() / 1000)
          }
          state.data[addr].messages.push(newMsg)
        },
        switchOrder (state, addr) {
          state.order.splice(state.order.indexOf(addr), 1)
          state.order.unshift(addr)
        },
        clearChat (state, addr) {
          state.data[addr].messages = []
        },
        clearCurrent (state) {
          state.activeChatAddr = null
        },
        deleteChat (state, addr) {
          state.order = state.order.filter(function (value, index, arr) {
            return value !== addr
          })
          if (state.activeChatAddr === addr) {
            state.activeChatAddr = null
          }
        },
        addChatPre (state, addr) {
          state.data[addr] = {
            messages: []
          }
        },
        addChatPost (state, addr) {
          state.order.unshift(addr)
          state.activeChatAddr = addr
        }
      },
      actions: {
        switchChatActive ({ commit }, addr) {
          commit('switchChatActive', addr)
        },
        async sendMessage ({ commit, rootGetters }, { addr, text }) {
          // Send locally
          commit('sendMessage', { addr, text })

          // Peer's relay server
          let privKey = rootGetters['wallet/getIdentityPrivKey']
          console.log(privKey)

          let client = new RelayClient('http://34.67.137.105:8080')
          let message = RelayClient.constructTextMessage(text, privKey)
          let messageSet = new messages.MessageSet()
          messageSet.addMessages(message)

          let senderAddr = privKey.toAddress('testnet').toLegacyAddress()
          console.log(senderAddr)

          client.pushMessages(senderAddr, messageSet)
        },
        switchOrder ({ commit }, addr) {
          commit('switchOrder', addr)
        },
        clearChat ({ commit }, addr) {
          commit('clearChat', addr)
        },
        clearCurrent ({ commit }) {
          commit('clearCurrent')
        },
        deleteChat ({ commit }, addr) {
          commit('deleteChat', addr)
        }
      }
    },
    keyserverHandler: {
      namespaced: true,
      state: {
        handler: new KeyserverHandler()
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
    relayClient: {
      namespaced: true,
      state: {
        client: new RelayClient('http://34.67.137.105:8080') // TODO: Make this a variable
      },
      mutations: {
        setClient (state, client) {
          state.client = client
        }
      },
      actions: {
        setClient ({ commit }, client) {
          commit('setClient', client)
        }
      },
      getters: {
        getClient (state) {
          return state.client
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
          let balanceJson = await this.state.electrumHandler.client.blockchainAddress_getBalance(address)
          let balance = balanceJson.confirmed + balanceJson.unconfirmed
          commit('updateBalance', { address, balance })
        },
        async updateBalances ({ commit }) {
          for (var addr in this.addresses) {
            let balanceJson = await this.state.electrumHandler.client.blockchainAddress_getBalance(addr)
            let balance = balanceJson.confirmed + balanceJson.unconfirmed
            commit('updateBalance', { addr, balance })
          }
        },
        async updateAddresses ({ commit }) {
          let client = this.state.electrumHandler.client
          for (var i = 0; i < 2; i++) {
            let privKey = this.state.wallet.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(i, true).privateKey
            let address = privKey.toAddress('testnet').toLegacyAddress()
            let balanceJson = await client.blockchainAddress_getBalance(address)
            let balance = balanceJson.confirmed + balanceJson.unconfirmed
            commit('setAddress', { address, balance, privKey })
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
          return state.identityPrivKey.toAddress('testnet') // TODO: Not just testnet
        },
        getMyAddressStr (state) {
          return state.identityPrivKey.toAddress('testnet') // TODO: Not just testnet
        },
        getAddresses (state) {
          return state.addresses
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
          // Example:
          // 'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': {
          //   name: 'Anon',
          //   bio: '',
          //   avatar: ...,
          //   acceptancePrice: ...
          // },
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
        },
        deleteContact (state, addr) {
          delete state.profiles[addr]
        }
      },
      actions: {
        async addNewContact ({ commit, dispatch }, addrLong) {
          let res = addrLong.split(':')
          let addr
          if (res.length === 2) {
            addr = res[1]
          } else {
            addr = res[0]
          }

          let profile = { 'name': 'Retreiving...' }

          commit('updateProfile', { addr, profile })

          commit('chats/addChatPre', addr, { root: true })

          await dispatch('refresh', addr)

          commit('chats/addChatPost', addr, { root: true })
        },
        deleteContact ({ commit }, addr) {
          commit('chats/clearChat', addr, { root: true })
          commit('chats/deleteChat', addr, { root: true })
          commit('deleteContact', addr)
        },
        async refresh ({ commit }, addr) {
          // Make this generic over networks

          // Get metadata
          // Batch this
          let metadata = await this.state.keyserverHandler.handler.uniformSample(`bchtest:${addr}`)

          let payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

          function isVCard (entry) {
            return entry.getKind() === 'vcard'
          }

          let entryList = payload.getEntriesList()

          // Get vCard
          let rawCard = entryList.find(isVCard).getEntryData()
          let strCard = new TextDecoder().decode(rawCard)

          let vCard = new VCard().parse(strCard)

          let name = vCard.data.fn._data

          // let bio = vCard.data.note._data
          let bio = ''

          // Get avatar
          function isAvatar (entry) {
            return entry.getKind() === 'avatar'
          }
          let avatarEntry = entryList.find(isAvatar)
          let rawAvatar = avatarEntry.getEntryData()
          function _arrayBufferToBase64 (buffer) {
            var binary = ''
            var bytes = new Uint8Array(buffer)
            var len = bytes.byteLength
            for (var i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            return window.btoa(binary)
          }
          let value = avatarEntry.getHeadersList()[0].getValue()
          let avatarDataURL = 'data:' + value + ';base64,' + _arrayBufferToBase64(rawAvatar)

          // Get fee
          let acceptancePrice
          try {
            let client = this.state.relayClient.client
            let filters = await client.getFilter(`bchtest:${addr}`)
            let priceFilter = filters.getPriceFilter()
            acceptancePrice = priceFilter.getAcceptancePrice()
          } catch (err) {
            acceptancePrice = 'Unknown'
          }

          let profile = {
            name,
            bio,
            avatar: avatarDataURL,
            acceptancePrice
          }
          commit('updateProfile', { addr, profile })
        },
        startProfileUpdater ({ commit, dispatch }) {
          setInterval(() => {
            for (let addr in this.state.contacts.profiles) {
              dispatch('refresh', addr)
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
        avatar: null,
        acceptancePrice: null
      },
      getters: {
        getMyProfile (state) {
          return state
        },
        getAcceptancePrice (state) {
          return state.acceptancePrice
        }
      },
      mutations: {
        setMyProfile (state, { name, avatar, bio }) {
          state.name = name
          state.avatar = avatar
          state.bio = bio
        },
        setAcceptancePrice (state, fee) {
          state.acceptancePrice = fee
        }
      },
      actions: {
        setMyProfile ({ commit }, profile) {
          commit('setMyProfile', profile)
        },
        setAcceptancePrice ({ commit }, fee) {
          commit('setAcceptancePrice', fee)
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
