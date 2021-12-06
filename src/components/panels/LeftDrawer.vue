<template>
  <div class="column full-height">
    <!-- Relay reconnect dialog -->
    <q-dialog v-model="relayConnectOpen">
      <relay-connect-dialog />
    </q-dialog>

    <q-tabs v-model="tab" v-if="$status.setup">
      <q-tab v-if="$status.setup" name="settings" icon="settings" />
      <q-tab name="contacts" icon="contacts" />
    </q-tabs>

    <settings-panel v-if="$status.setup" v-show="tab == 'settings'" />

    <chat-list v-show="tab == 'contacts'" v-bind="$attrs" :compact="false" />

    <q-list v-if="$status.setup">
      <q-separator />
      <q-item clickable>
        <q-item-section @click="receiveECash">
          <q-item-label>{{ $t('chatList.balance') }}</q-item-label>
          <q-item-label caption>
            {{ formattedBalance }}
          </q-item-label>
        </q-item-section>
        <q-item-section v-if="!walletConnected" side>
          <q-btn icon="account_balance_wallet" flat round color="red" />
        </q-item-section>
        <q-item-section
          v-if="!relayConnected"
          side
          clickable
          @click="relayConnectOpen = true"
        >
          <q-btn icon="email" flat round color="red" />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'

import ChatList from '../chat/ChatList.vue'
import SettingsPanel from '../panels/SettingsPanel.vue'
import RelayConnectDialog from '../dialogs/RelayConnectDialog.vue'
import { formatBalance } from '../../utils/formatting'
import { openPage } from '../../utils/routes'

const compactCutoff = 325

export default {
  components: {
    ChatList,
    SettingsPanel,
    RelayConnectDialog,
  },
  data() {
    return {
      tab: 'contacts',
      // My Drawer
      walletOpen: false,
      relayConnectOpen: false,
      newContactOpen: false,
      //
      trueSplitterRatio: compactCutoff,
    }
  },
  methods: {
    ...mapActions({
      setActiveChat: 'chats/setActiveChat',
      addDefaultContact: 'contacts/addDefaultContact',
    }),
    ...mapGetters({
      getDarkMode: 'appearance/getDarkMode',
    }),
    tweak(offset, viewportHeight) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    toggleContactBookOpen() {
      this.contactBookOpen = !this.contactBookOpen
    },
    toggleMyDrawerOpen() {
      if (this.compact) {
        this.compact = false
        this.trueSplitterRatio = compactCutoff
      }
      this.myDrawerOpen = !this.myDrawerOpen
    },
    shortcutKeyListener(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        this.toggleContactBookOpen()
      }
    },
    contactClicked(address) {
      this.contactBookOpen = false

      return this.setActiveChat(address)
    },
    receiveECash() {
      openPage(this.$router, this.$route.path, '/receive')
    },
  },
  computed: {
    ...mapState('chats', ['chats', 'activeChatAddr']),
    ...mapGetters({
      getContact: 'contacts/getContact',
      lastReceived: 'chats/getLastReceived',
      totalUnread: 'chats/totalUnread',
      getRelayData: 'myProfile/getRelayData',
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getNumUnread: 'chats/getNumUnread',
      balance: 'wallet/balance',
    }),
    relayConnected() {
      return this.$relay.connected
    },
    walletConnected() {
      return this.$electrum.connected
    },
    formattedBalance() {
      if (!this.balance) {
        return
      }
      return formatBalance(this.balance)
    },
  },
}
</script>
