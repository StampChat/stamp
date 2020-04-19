<template>
  <q-layout view="hHr LpR lff">
    <q-dialog v-model="walletConnectOpen">
      <wallet-connect-dialog />
    </q-dialog>
    <my-drawer v-if="loaded" />
    <contact-drawer
      v-if="activeChatAddr !== null"
      :address="activeChatAddr"
      :contact="getContact(activeChatAddr)"
    />
    <main-header v-bind:splitRatio="splitterRatio" @splitting="setSplitRatio"></main-header>
    <q-page-container>
      <q-page :style-fn="tweak" v-if="loaded">
        <q-splitter
          v-model="splitterRatio"
          separator-style="width: 0px"
          :limits="[minSplitter, maxSplitter]"
          :style="`height: inherit; min-height: inherit;`"
        >
          <template v-slot:before :style="`height: 100%; min-height: 100%;`">
            <chat-list :style="`height: 100%; min-height: 100%;`" />
          </template>

          <template v-slot:after>
            <chat
              v-for="(item, index) in data"
              v-show="activeChatAddr === index"
              :key="index"
              :address="index"
              :messages="item.messages"
              :active="activeChatAddr === index"
              :style="`height: inherit; min-height: inherit;`"
            />
          </template>
        </q-splitter>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import Chat from '../pages/Chat.vue'
import ChatList from '../components/chat/ChatList.vue'
import MyDrawer from '../components/drawers/MyDrawer.vue'
import ContactDrawer from '../components/drawers/ContactDrawer.vue'
import MainHeader from '../components/MainHeader.vue'
import WalletConnectDialog from '../components/dialogs/WalletConnectDialog.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import { minSplitter, maxSplitter } from '../utils/constants'

export default {
  components: {
    Chat,
    ChatList,
    ContactDrawer,
    MyDrawer,
    MainHeader,
    WalletConnectDialog
  },
  data () {
    return {
      minSplitter,
      maxSplitter,
      walletConnectOpen: false,
      splitterRatio: 20,
      loaded: false
    }
  },
  methods: {
    ...mapActions({
      refreshChat: 'chats/refresh',
      setActiveChat: 'chats/setActiveChat',
      relayClientRehydrate: 'relayClient/rehydrate'
    }),
    ...mapGetters({
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getDarkMode: 'appearance/getDarkMode'
    }),
    tweak (offset, viewportHeight) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    setSplitRatio (value) {
      this.splitterRatio = value
    }
  },
  computed: {
    ...mapState('chats', ['data', 'activeChatAddr']),
    ...mapGetters({
      getToken: 'relayClient/getToken',
      getRelayClient: 'relayClient/getClient',
      getContact: 'contacts/getContact'
    }),
    walletConnected () {
      return this.$electrum.connected
    }
  },
  watch: {
    walletConnected (newVal, oldVal) {
      // TODO: Debounce
      this.walletConnectOpen = !newVal
    }
  },
  async created () {
    this.$q.dark.set(this.getDarkMode())
    // Start relay listener
    this.$q.loading.show({
      delay: 0,
      message: 'Updating messages and checking wallet integrity...'
    })

    console.log('loading')
    // Setup everything at once. This are independent processes
    try {
      // Rehydrate relay client
      this.relayClientRehydrate()

      const client = this.getRelayClient
      client.setUpWebsocket(this.$wallet.myAddressStr, this.getToken)
      await this.refreshChat()
      await this.$wallet.init()
    } catch (err) {
      console.error(err)
    }

    if (!this.activeChatAddr) {
      const contacts = this.getSortedChatOrder()
      if (contacts.length) {
        this.setActiveChat(contacts[0].address)
      }
    }
    this.$q.loading.hide()

    console.log('loaded')

    this.loaded = true
  }
}
</script>
