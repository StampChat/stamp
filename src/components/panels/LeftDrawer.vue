<template>
  <div class="column full-height">
    <!-- Relay reconnect dialog -->
    <q-dialog v-model="relayConnectOpen">
      <relay-connect-dialog />
    </q-dialog>

    <!-- New contact dialog -->
    <q-dialog v-model="newContactOpen">
      <new-contact-dialog />
    </q-dialog>
    <q-tabs v-model="tab">
      <q-tab
        name="settings"
        icon="settings"
      />
      <q-tab
        name="contacts"
        icon="contacts"
      />
    </q-tabs>

    <settings-panel v-show="tab=='settings'" />

    <chat-list
      v-show="tab=='contacts'"
      :loaded="loaded"
      @toggleMyDrawerOpen="toggleMyDrawerOpen"
      :compact="false"
    />

    <q-list>
      <q-separator />
      <q-item clickable>
        <q-item-section @click="receiveECash">
          <q-item-label>{{ $t('chatList.balance') }}</q-item-label>
          <q-item-label caption>
            {{ formattedBalance }}
          </q-item-label>
        </q-item-section>
        <q-item-section
          v-if="!walletConnected"
          side
        >
          <q-btn
            icon="account_balance_wallet"
            flat
            round
            color="red"
          />
        </q-item-section>
        <q-item-section
          v-if="!relayConnected"
          side
          clickable
          @click="relayConnectOpen=true"
        >
          <q-btn
            icon="email"
            flat
            round
            color="red"
          />
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
    RelayConnectDialog
  },
  props: {
    loaded: {
      type: Boolean,
      required: true
    }
  },
  data () {
    return {
      tab: 'contacts',
      // My Drawer
      walletOpen: false,
      relayConnectOpen: false,
      newContactOpen: false,
      //
      trueSplitterRatio: compactCutoff
    }
  },
  methods: {
    ...mapActions({
      setActiveChat: 'chats/setActiveChat',
      addDefaultContact: 'contacts/addDefaultContact'
    }),
    ...mapGetters({
      getDarkMode: 'appearance/getDarkMode'
    }),
    tweak (offset, viewportHeight) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    toggleContactDrawerOpen () {
      this.contactDrawerOpen = !this.contactDrawerOpen
    },
    toggleContactBookOpen () {
      this.contactBookOpen = !this.contactBookOpen
    },
    toggleMyDrawerOpen () {
      if (this.compact) {
        this.compact = false
        this.trueSplitterRatio = compactCutoff
      }
      this.myDrawerOpen = !this.myDrawerOpen
    },
    shortcutKeyListener (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        this.toggleContactBookOpen()
      }
    },
    contactClicked (address) {
      this.contactBookOpen = false

      return this.setActiveChat(address)
    },
    formatBalance (balance) {
      if (!balance) {
        return
      }
      return formatBalance(balance)
    },
    receiveECash () {
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
      balance: 'wallet/balance'
    }),
    relayConnected () {
      return this.$relay.connected
    },
    walletConnected () {
      return this.$electrum.connected
    },
    formattedBalance () {
      return formatBalance(this.balance)
    }
  }
}
</script>
