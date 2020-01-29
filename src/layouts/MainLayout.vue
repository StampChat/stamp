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
        :limits="[minSplitter, maxSplitter]"
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
import { minSplitter, maxSplitter } from '../utils/constants'

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
      tabHeight: 50,
      minSplitter,
      maxSplitter
    }
  },
  methods: {
    ...mapActions(['setSplitterRatio', 'startClock']),
    ...mapActions({
      walletReinitialize: 'wallet/reinitialize',
      relayClientReinitialize: 'relayClient/reinitialize',
      startContactUpdater: 'contacts/startContactUpdater',
      refreshChat: 'chats/refresh',
      updateUTXOs: 'wallet/updateUTXOs'
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
  async created () {
    // Reinitialize wallet classes
    this.walletReinitialize()

    // Reinitialize relay client
    this.relayClientReinitialize()

    this.$q.loading.show({
      delay: 100,
      message: 'Updating wallet...'
    })

    // Update UTXOs
    await this.updateUTXOs()

    // Start websocket listener
    this.$q.loading.show({
      delay: 100,
      message: 'Connecting to relay server...'
    })
    let client = this.getRelayClient
    client.setUpWebsocket(this.getAddressStr, this.getToken)

    this.$q.loading.hide()

    // Get historic messages
    this.refreshChat()

    // Start profile watcher
    this.startContactUpdater()

    // Start internal timer
    this.startClock()
  }
}
</script>
