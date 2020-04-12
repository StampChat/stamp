import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import modules from './modules'

Vue.use(Vuex)

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  filter: (mutation) => {
    let namespace = mutation.type.split('/')[0]
    switch (namespace) {
      case 'contactDrawer':
        return false
      case 'myDrawer':
        return false
    }

    switch (mutation.type) {
      case 'chats/setInputMessage':
        return false
      case 'chats/setInputMessageActive':
        return false
    }

    return true
  }
})

export default new Vuex.Store({
  modules,
  plugins: [vuexLocal.plugin]
  // strict: true
})
