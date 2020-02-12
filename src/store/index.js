import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'

Vue.use(Vuex)

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  filter: (mutation) => {
    console.log(mutation.type)
    switch (mutation.type) {
      case 'chats/sendMessageLocal':
        return true
      case 'chats/receiveMessage':
        return true
      case 'chats/deleteMessage':
        return true
      case 'chats/deleteChat':
        return true
      case 'chats/clearChat':
        return true
    }
    if (mutation.type.startsWith('wallet/')) {
      return true
    }

    return false
  }
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
