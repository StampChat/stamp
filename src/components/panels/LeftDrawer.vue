<template>
  <div class="column full-height">
    <!-- Relay reconnect dialog -->
    <q-dialog v-model="relayConnectOpen">
      <relay-connect-dialog />
    </q-dialog>

    <q-tabs v-model="tab" v-if="$status.setup">
      <q-tab v-if="$status.setup" name="settings" icon="settings" />
      <q-tab name="contacts" icon="contacts">
        <q-badge
          floating
          color="secondary"
          :label="totalUnread"
          class="q-my-xs"
          v-if="totalUnread !== 0"
        />
      </q-tab>

      <q-tab name="topics" icon="forum" />
    </q-tabs>

    <settings-panel v-if="$status.setup" v-show="tab == 'settings'" />
    <div v-if="!$status.setup">
      <q-separator />
      <chat-list-link title="Login/Sign Up" route="/setup" icon="login" />
    </div>

    <chat-list v-show="tab == 'contacts'" v-bind="$attrs" :compact="false" />
    <topic-list v-show="tab == 'topics'" v-bind="$attrs" :compact="false" />

    <q-list v-if="$status.setup">
      <q-separator />
      <q-item clickable>
        <q-item-section @click="receiveLotus">
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
import { storeToRefs } from 'pinia'

import ChatList from '../chat/ChatList.vue'
import ChatListLink from '../chat/ChatListLink.vue'
import TopicList from '../topic/TopicList.vue'
import SettingsPanel from '../panels/SettingsPanel.vue'
import RelayConnectDialog from '../dialogs/RelayConnectDialog.vue'

import { formatBalance } from '../../utils/formatting'
import { openChat, openPage } from '../../utils/routes'
import { useWalletStore } from 'src/stores/wallet'
import { useChatStore } from 'src/stores/chats'

const compactCutoff = 325

export default defineComponent({
  setup() {
    const chats = useChatStore()
    const wallet = useWalletStore()
    const { totalUnread } = storeToRefs(chats)

    return {
      totalUnread: totalUnread,
      formattedBalance: computed(() => formatBalance(wallet.balance)),
    }
  },
  components: {
    ChatListLink,
    ChatList,
    TopicList,
    SettingsPanel,
    RelayConnectDialog,
  },
  data() {
    return {
      tab: 'topics',
      // My Drawer
      walletOpen: false,
      relayConnectOpen: false,
      newContactOpen: false,
      //
      trueSplitterRatio: compactCutoff,
      compact: false as boolean,
      myDrawerOpen: false as boolean,
    }
  },
  methods: {
    tweak(offset: number, viewportHeight: number) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    toggleMyDrawerOpen() {
      if (this.compact) {
        this.compact = false
        this.trueSplitterRatio = compactCutoff
      }
      this.myDrawerOpen = !this.myDrawerOpen
    },
    contactClicked(address: string) {
      openChat(this.$router, address)
    },
    receiveLotus() {
      openPage(this.$router, '/receive')
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
