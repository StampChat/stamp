<template>
  <q-layout view="hHr LpR lff">
    <my-drawer />
    <contact-drawer
      v-if="getActiveChat !== null"
      :address="getActiveChat"
      :contact="getContact(getActiveChat)"
    />
    <main-header>
      <q-resize-observer @resize="onResize" />
    </main-header>
    <q-page-container>
      <q-splitter
        emit-immediately
        v-model="splitterRatio"
        separator-style="width: 0px"
      >
        <template v-slot:before>
          <chat-list />
        </template>

        <template v-slot:after>
          <chat
            :tabHeight="tabHeight"
            :activeChat="getActiveChat"
            :messages="getAllMessages(getActiveChat)"
          />
        </template>

      </q-splitter>
    </q-page-container>
  </q-layout>
</template>

<script>
import Chat from '../pages/Chat.vue'
import ChatList from '../components/chat/ChatList.vue'
import MyDrawer from '../components/drawers/MyDrawer.vue'
import ContactDrawer from '../components/drawers/ContactDrawer.vue'
import MainHeader from '../components/MainHeader.vue'
import { mapActions, mapGetters } from 'vuex'
import { dom } from 'quasar'
const { height } = dom

export default {
  name: 'MainLayout',
  components: {
    Chat,
    ChatList,
    ContactDrawer,
    MyDrawer,
    MainHeader
  },
  data () {
    return {
      tabHeight: 50
    }
  },
  methods: {
    ...mapActions(['setSplitterRatio', 'startClock']),
    ...mapActions({
      walletReinitialize: 'wallet/reinitialize',
      relayClientReinitialize: 'relayClient/reinitialize',
      startContactUpdater: 'contacts/startContactUpdater',
      refreshChat: 'chats/refresh'
    }),
    onResize (size) {
      this.tabHeight = height(this.$refs.tabs.$el)
    }
  },
  computed: {
    ...mapGetters({
      getToken: 'relayClient/getToken',
      getRelayClient: 'relayClient/getClient',
      getAddressStr: 'wallet/getMyAddressStr',
      getActiveChat: 'chats/getActiveChat',
      getContact: 'contacts/getContact',
      getAllMessages: 'chats/getAllMessages'

    }),
    ...mapGetters([
      'getSplitterRatio'
    ]),
    splitterRatio: {
      get () {
        return this.getSplitterRatio
      },
      set (value) {
        this.setSplitterRatio(value)
      }
    }
  },
  created () {
    // Start internal timer
    this.startClock()

    // Reinitialize wallet classes
    this.walletReinitialize()

    // Reinitialize relay client
    this.relayClientReinitialize()

    // Start profile watcher
    this.startContactUpdater()

    // Start websocket listener
    let client = this.getRelayClient
    client.setUpWebsocket(this.getAddressStr, this.getToken)

    // Get historic messages
    this.refreshChat()
  }
}
</script>
