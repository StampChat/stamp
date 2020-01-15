import Vue from 'vue'
import Vuex from 'vuex'
import KeyserverHandler from '../keyserver/handler'
import RelayClient from '../relay/client'
import addressmetadata from '../keyserver/addressmetadata_pb'
import VCard from 'vcf'
import VuexPersistence from 'vuex-persist'
import messages from '../relay/messages_pb'
import relayConstructors from '../relay/constructors'
import { PublicKey } from 'bitcore-lib-cash'
import crypto from '../relay/crypto'

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
        data: {},
        lastReceived: null
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
        },
        getLastReceived (state) {
          return state.lastReceived
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
        },
        receiveMessage (state, { addr, text, timestamp }) {
          let newMsg = {
            outbound: false,
            sent: true,
            body: text,
            timestamp
          }
          state.data[addr].messages.push(newMsg)
        },
        setLastReceived (state, lastReceived) {
          state.lastReceived = lastReceived
        }
      },
      actions: {
        switchChatActive ({ commit }, addr) {
          commit('switchChatActive', addr)
        },
        startChatUpdater ({ commit, dispatch }) {
          setInterval(() => {
            dispatch('refresh')
          }, 1_000)
        },
        async sendMessage ({ commit, rootGetters }, { addr, text }) {
          // Send locally
          commit('sendMessage', { addr, text })

          // Peer's relay server
          let privKey = rootGetters['wallet/getIdentityPrivKey']

          let client = new RelayClient('34.67.137.105:8080')
          let destPubKey = rootGetters['contacts/getPubKey'](addr)
          let message = relayConstructors.constructTextMessage(text, privKey, destPubKey, 1)
          let messageSet = new messages.MessageSet()
          messageSet.addMessages(message)

          let senderAddr = privKey.toAddress('testnet').toLegacyAddress()

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
        },
        async refresh ({ commit, rootGetters, getters }) {
          if (rootGetters['wallet/isSetupComplete'] === false) {
            return
          }
          let myAddressStr = rootGetters['wallet/getMyAddressStr']
          let client = rootGetters['relayClient/getClient']
          let lastReceived = getters['getLastReceived'] || 0

          // If token is null then purchase one
          let token = rootGetters['relayClient/getToken']

          let messagePage = await client.getMessages(myAddressStr, token, lastReceived, null)
          let messageList = messagePage.getMessagesList()
          for (let index in messageList) {
            let timedMessage = messageList[index]

            // TODO: Check correct destination
            // let destPubKey = timedMessage.getDestination()

            let timestamp = timedMessage.getTimestamp()
            let message = timedMessage.getMessage()
            let rawSenderPubKey = message.getSenderPubKey()
            let senderPubKey = cashlib.PublicKey.fromBuffer(rawSenderPubKey)
            let addr = senderPubKey.toAddress('testnet').toCashAddress() // TODO: Make generic
            let rawPayload = message.getSerializedPayload()

            let payload = messages.Payload.deserializeBinary(rawPayload)
            let scheme = payload.getScheme()
            let entriesRaw
            if (scheme === 0) {
              entriesRaw = payload.getEntries()
            } else if (scheme === 1) {
              let entriesCipherText = payload.getEntries()

              let secretSeed = payload.getSecretSeed()
              let ephemeralPubKey = PublicKey.fromBuffer(secretSeed)
              let privKey = rootGetters['wallet/getIdentityPrivKey']
              entriesRaw = crypto.decrypt(entriesCipherText, privKey, senderPubKey, ephemeralPubKey)
            } else {
              // TODO: Raise error
            }

            let entries = messages.Entries.deserializeBinary(entriesRaw)
            let entriesList = entries.getEntriesList()
            let lastReceived = null
            for (let index in entriesList) {
              let entry = entriesList[index]
              // TODO: Don't assume it's a text msg
              let text = new TextDecoder().decode(entry.getEntryData())
              commit('receiveMessage', { addr, text, timestamp })
              lastReceived = Math.max(lastReceived, timestamp)
            }
            if (lastReceived) {
              commit('setLastReceived', lastReceived + 1)
            }
          }
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
        client: null, // TODO: Make this a variable
        token: null
      },
      mutations: {
        setClient (state, client) {
          state.client = client
        },
        setToken (state, token) {
          state.token = token
        },
        reinitialize (state) {
          if (state.client !== null) {
            state.client = new RelayClient(state.client.url)
          }
        }
      },
      actions: {
        setClient ({ commit }, client) {
          commit('setClient', client)
        },
        setToken ({ commit }, token) {
          commit('setToken', token)
        },
        reinitialize ({ commit }) {
          commit('reinitialize')
        }
      },
      getters: {
        getClient (state) {
          return state.client
        },
        getToken (state) {
          return state.token
        }
      }
    },
    wallet: {
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
          return state.identityPrivKey.toAddress('testnet').toCashAddress() // TODO: Not just testnet
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
          //   acceptancePrice: ...,
          //   pubKey: ...
          // },
        }
      },
      getters: {
        getProfile: (state) => (addr) => {
          return state.profiles[addr]
        },
        getPubKey: (state) => (addr) => {
          let arr = Uint8Array.from(Object.values(state.profiles[addr].pubKey))
          return PublicKey.fromBuffer(arr)
        }
      },
      mutations: {
        updateContact (state, { addr, profile }) {
          state.profiles[addr] = profile
        },
        deleteContact (state, addr) {
          delete state.profiles[addr]
        }
      },
      actions: {
        addContact ({ commit }, { addr, profile }) {
          commit('chats/addChatPre', addr, { root: true })
          commit('updateContact', { addr, profile })
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
          let metadata = await this.state.keyserverHandler.handler.uniformSample(addr)

          // Get PubKey
          let pubKey = metadata.getPubKey()

          let payload = addressmetadata.Payload.deserializeBinary(metadata.getSerializedPayload())

          // Find vCard
          function isVCard (entry) {
            return entry.getKind() === 'vcard'
          }
          let entryList = payload.getEntriesList()
          let rawCard = entryList.find(isVCard).getEntryData() // TODO: Cancel if not found
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
            let filters = await client.getFilter(addr)
            let priceFilter = filters.getPriceFilter()
            acceptancePrice = priceFilter.getAcceptancePrice()
          } catch (err) {
            acceptancePrice = 'Unknown'
          }

          let profile = {
            name,
            bio,
            avatar: avatarDataURL,
            acceptancePrice,
            pubKey
          }
          commit('updateContact', { addr, profile })
        },
        startProfileUpdater ({ dispatch }) {
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
        splitterRatio: 20
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
