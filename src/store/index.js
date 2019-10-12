import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation
 */

export default function (/* { ssrContext } */) {
  const Store = new Vuex.Store({
    modules: {
      drawer: {
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
          order: ['qrkvs8hd56s5q8ryw44yfqn2fyhjruvpru9f0renmd', 'qqk9ahcesacaymnvptwszq4hmn5u57jthqnegsdenw'],
          activeChatAddr: 'qqk9ahcesacaymnvptwszq4hmn5u57jthqnegsdenw',
          data: {
            'qqk9ahcesacaymnvptwszq4hmn5u57jthqnegsdenw': {
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
            'qrkvs8hd56s5q8ryw44yfqn2fyhjruvpru9f0renmd': {
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
          }
        }
      },
      contacts: {
        namespaced: true,
        state: {
          profiles: {
            'qqk9ahcesacaymnvptwszq4hmn5u57jthqnegsdenw': {
              'name': 'Shammah'
            },
            'qrkvs8hd56s5q8ryw44yfqn2fyhjruvpru9f0renmd': {
              'name': 'Calin'
            }
          }
        },
        getters: {
          getProfile: (state) => (addr) => {
            return state.profiles[addr]
          }
        }
      },
      myProfile: {
        namespaced: true,
        state: {
          name: 'Harry Barber',
          address: 'pp8skudq3x5hzw8ew7vzsw8tn4k8wxsqsv0lt0mf3g'
        },
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

    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  })

  return Store
}
