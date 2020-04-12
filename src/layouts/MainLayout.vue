<template>
  <q-layout view="hHr LpR lff">
    <q-dialog v-model="walletConnectOpen">
      <wallet-connect-dialog />
    </q-dialog>
    <my-drawer />
    <contact-drawer
      v-if="activeChatAddr !== null"
      :address="activeChatAddr"
      :contact="getContact(activeChatAddr)"
    />
    <main-header>
      <q-resize-observer @resize="onResize" />
    </main-header>
    <q-page-container>
      <q-page :style-fn="tweak">
        <q-splitter
          emit-immediately
          v-model="splitterRatio"
          separator-style="width: 0px"
          :limits="[minSplitter, maxSplitter]"
          :style="`height: inherit; min-height: inherit;`"
        >
          <template v-slot:before :style="`height: 100%; min-height: 100%;`">
            <chat-list :style="`height: 100%; min-height: 100%;`" />
          </template>

          <template
            v-slot:after
          >
            <template v-for="(item, index) in data">
              <chat
                v-show="activeChatAddr === index"
                :key="index"
                :activeChat="activeChatAddr"
                :messages="item.messages"
                :style="`height: inherit; min-height: inherit;`"
              />
            </template>
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
import { dom } from 'quasar'
const { height } = dom
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
      walletConnectOpen: false
    }
  },
  methods: {
    ...mapActions({
      setSplitterRatio: 'splitter/setSplitterRatio',
      walletRehydrate: 'wallet/rehydrate',
      electrumRehydrate: 'electrumHandler/rehydrate',
      electrumConnect: 'electrumHandler/connect',
      electrumKeepAlive: 'electrumHandler/keepAlive',
      relayClientRehydrate: 'relayClient/rehydrate',
      startContactUpdater: 'contacts/startContactUpdater',
      refreshChat: 'chats/refresh',
      updateHDUTXOs: 'wallet/updateHDUTXOs',
      fixFrozenUTXOs: 'wallet/fixFrozenUTXOs',
      fixUTXOs: 'wallet/fixUTXOs',
      startListeners: 'wallet/startListeners'
    }),
    ...mapGetters({
      getAllAddresses: 'wallet/getAllAddresses'
    }),
    onResize (size) {
      this.tabHeight = height(this.$refs.tabs.$el)
    },
    tweak (offset, viewportHeight) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    }
  },
  computed: {
    ...mapState('chats', ['data', 'activeChatAddr']),
    ...mapGetters({
      getToken: 'relayClient/getToken',
      getRelayClient: 'relayClient/getClient',
      getAddressStr: 'wallet/getMyAddressStr',
      getContact: 'contacts/getContact',
      walletConnected: 'electrumHandler/connected'
    }),
    ...mapGetters({ getSplitterRatio: 'splitter/getSplitterRatio' }),
    splitterRatio: {
      get () {
        return this.getSplitterRatio
      },
      set (value) {
        this.setSplitterRatio(value)
      }
    }
  },
  watch: {
    walletConnected (newVal, oldVal) {
      // TODO: Debounce
      this.walletConnectOpen = !newVal
    }
  },
  async created () {
    // Rehydrate electrum
    this.electrumRehydrate()
    this.electrumConnect()
    this.electrumKeepAlive()

    // Rehydrate wallet classes
    this.walletRehydrate()

    // Rehydrate relay client
    this.relayClientRehydrate()

    // Start relay listener
    this.$q.loading.show({
      delay: 100,
      message: 'Connecting to relay server...'
    })
    try {
      let client = this.getRelayClient
      client.setUpWebsocket(this.getAddressStr, this.getToken)
    } catch (err) {
      console.error(err)
    }

    // Get historic messages
    this.$q.loading.show({
      delay: 100,
      message: 'Getting messages...'
    })
    try {
      await this.refreshChat()
    } catch (err) {
      console.error(err)
    }

    this.$q.loading.show({
      delay: 100,
      message: 'Updating wallet...'
    })

    try {
      // Start electrum listeners
      let addresses = Object.keys(this.getAllAddresses())
      this.startListeners(addresses)

      // Update UTXOs
      await this.updateHDUTXOs()

      // Fix frozen UTXOs
      await this.fixFrozenUTXOs()

      // Fix UTXOs
      await this.fixUTXOs()
    } catch (err) {
      console.error(err)
    }

    this.$q.loading.hide()

    // Start contact watcher
    this.startContactUpdater()
  }
}
</script>
