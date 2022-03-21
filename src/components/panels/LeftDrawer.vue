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
          <q-item-label caption>{{ formattedBalance }}</q-item-label>
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

<script lang="ts">
import { defineComponent, computed } from 'vue'

import ChatList from '../chat/ChatList.vue'
import SettingsPanel from '../panels/SettingsPanel.vue'
import RelayConnectDialog from '../dialogs/RelayConnectDialog.vue'
import { formatBalance } from '../../utils/formatting'
import { openPage } from '../../utils/routes'
import { useWalletStore } from 'src/stores/wallet'
import { useChatStore } from 'src/stores/chats'
import { useAppearanceStore } from 'src/stores/appearance'
import { useProfileStore } from 'src/stores/my-profile'
import { useContactStore } from 'src/stores/contacts'

const compactCutoff = 325

export default defineComponent({
  setup() {
    const chats = useChatStore()
    const wallet = useWalletStore()
    const appearance = useAppearanceStore()
    const myProfile = useProfileStore()
    const contacts = useContactStore()

    return {
      setActiveChat: chats.setActiveChat,
      addDefaultContact: contacts.addDefaultContact,
      darkMode: computed(() => appearance.darkMode),
      activeCharAddr: computed(() => chats.activeChatAddr),
      getContact: contacts.getContact,
      lastReceived: chats.getLastReceived,
      totalUnread: chats.totalUnread,
      getRelayData: myProfile,
      getSortedChatOrder: chats.getSortedChatOrder,
      getNumUnread: chats.getNumUnread,
      formattedBalance: computed(() => formatBalance(wallet.balance)),
    }
  },
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
      contactBookOpen: false as boolean,
      compact: false as boolean,
      myDrawerOpen: false as boolean,
    }
  },
  methods: {
    tweak(offset: number, viewportHeight: number) {
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
    shortcutKeyListener(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        this.toggleContactBookOpen()
      }
    },
    contactClicked(address: string) {
      this.contactBookOpen = false

      return this.setActiveChat(address)
    },
    receiveECash() {
      openPage(this.$router, this.$route.path, '/receive')
    },
  },
  computed: {
    relayConnected(): boolean {
      return this.$relay.connected
    },
    walletConnected(): boolean {
      return this.$indexer.connected
    },
  },
})
</script>
