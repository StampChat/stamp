import VCard from 'vcf'
import Vue from 'vue'
import Vuex from 'vuex'
import grpc from 'grpc'

import addressmetadata from '../keyserver/addressmetadata_pb'
import keyserverClient from '../keyserver/client'
import transaction from '../photon/transaction_grpc_pb'
import scriptHash from '../photon/script_hash_grpc_pb'

Vue.use(Vuex)

import VuexPersistence from 'vuex-persist'

const vuexLocal = new VuexPersistence({ storage: window.localStorage })

export default new Vuex.Store({
  modules: {
    myDrawer: {
      namespaced: true,
      state: { drawerOpen: false },
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
      state: { drawerOpen: false },
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
        order: [
          'qrtwst5ggcw59g8yk0x3qj4g5qdt28frts0g526x6g',
          'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs'
        ],
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
          return state.data[addr]
            .messages[state.data[addr].messages.length - 1]
            .body
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

          state.data[addr]
            .messages.push(newMsg)
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
      state: { handler: new keyserverClient.Handler() },
      mutations: {
        setHandler (state, handler) {
          state.handler = handler
        }
      },
      actions: {
        setHandler ({ commit }, handler) {
          commit('setHandler', handler)
        }
      }
    },
    contacts: {
      namespaced: true,
      state: {
        profiles: {
          'qz5fqvs0xfp4p53hj0kk7v3h5t8qwx5pdcd7vv72zs': { 'name': 'Shammah' },
          'qrtwst5ggcw59g8yk0x3qj4g5qdt28frts0g526x6g': { 'name': 'Calin' }
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
              this.state.keyserverHandler.handler
                .uniformSample(`bchtest:${addr}`)
                .then(function (metadata) {
                  let payload = addressmetadata.Payload.deserializeBinary(
                    metadata.getSerializedPayload())

                  function isVCard (entry) {
                    return entry.getKind() === 'vcard'
                  }

                  let entryList = payload.getEntriesList()

                  let rawCard = entryList.find(isVCard).getEntryData()
                  let strCard = new TextDecoder().decode(rawCard)

                  let vCard = new VCard().parse(strCard)

                  let profile = { 'name': vCard.data.fn._data }

                  commit('updateProfile', { addr, profile })
                })
            }
          }, 1000)
        }
      }
    },
    myProfile: {
      namespaced: true,
      state: { name: null, address: null, wallet: { xPrivKey: null, seqNum: 0 } },
      getters: {
        getMyProfile (state) {
          let profile = {
            'name': state.name,
            'address': state.address
          }

          return profile
        },
        getMyAddress (state) {
          return state.address
        },
        getPaymentAddress: (state) => (seqNum) => {
          if (state.wallet.xPrivKey !== null) {
            let privkey = state.wallet.xPrivKey.deriveChild(44)
              .deriveChild(0)
              .deriveChild(0)
              .deriveChild(seqNum, true)
            return privkey.toAddress()
          } else {
            return null
          }
        }
      },
      mutations: {
        setMyProfile (state, profile) {
          state.name = profile.name
          state.address = profile.address
        },
        setXPrivKey (state, newXPrivKey) {
          state.wallet.xPrivKey = newXPrivKey
        }
      },
      actions: {
        setMyProfile ({ commit }, profile) {
          commit('setMyProfile', profile)
        },
        setXPrivKey ({ commit }, newXPrivKey) {
          commit('setXPrivKey', newXPrivKey)
        }
      }
    },
    splitter: {
      state: { splitterRatio: 40 },
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
      state: { now: Date.now() },
      mutations: {
        updateClock (state) {
          state.now = Date.now()
        }
      },
      actions: {
        startClock ({ commit }) {
          setInterval(() => { commit('updateClock') }, 1000)
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
    },
    photonHandler: {
      namespaced: true,
      state: { txStub: null, scriptHashStub: null },
      getters: {
        getTxStub (state) {
          return state.txStub
        },
        getScriptHashStub (state) {
          return state.scriptHashStub
        }
      },
      mutations: {
        setStubs (state, stubs) {
          state.txStub = stubs.txStub
          state.scriptHashStub = stubs.scriptHashStub
        }
      },
      actions: {
        new ({ commit }, addr) {
          let insecureChannel = grpc.credentials.createInsecure()
          let txStub = new transaction.Transaction(addr, insecureChannel)
          let scriptHashStub =
            new scriptHash.ScriptHash(addr, insecureChannel)
          let stubs = { 'txStub': txStub, 'scripHashStub': scriptHashStub }

          commit('setStubs', stubs)
        }
      }
    }
  },
  plugins: [vuexLocal.plugin]
})
