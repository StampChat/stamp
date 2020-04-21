<template>
  <q-list>
    <!-- Wallet dialog -->
    <q-dialog v-model="walletOpen">
      <wallet-dialog />
    </q-dialog>

    <!-- Wallet reconnect dialog -->
    <q-dialog v-model="walletConnectOpen">
      <wallet-connect-dialog />
    </q-dialog>

    <!-- Relay reconnect dialog -->
    <q-dialog v-model="relayConnectOpen">
      <relay-connect-dialog />
    </q-dialog>

    <q-item
      clickable
      v-ripple
    >
      <q-item-section @click="walletOpen=true">
        <q-item-label>Balance</q-item-label>
        <q-item-label caption>{{ getBalance }}</q-item-label>
      </q-item-section>
      <q-item-section
        v-if="!walletConnected"
        side
        clickable
        @click="walletConnectOpen=true"
      >
        <q-btn
          icon='account_balance_wallet'
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
          icon='email'
          flat
          round
          color="red"
        />
      </q-item-section>
    </q-item>
    <q-separator />
    <q-scroll-area
      class="q-px-none row"
      :style="`min-height:calc(100% - 51px); height: calc(100% - 51px);`"
    >
      <chat-list-item
        v-for="(contact) in getSortedChatOrder"
        :key="contact.address"
        :chatAddr="contact.address"
        :valueUnread="formatBalance(contact.totalUnreadValue)"
        :numUnread="contact.totalUnreadMessages"
      />
      <q-item v-if="getSortedChatOrder.length === 0">
        <q-item-section>
          <q-item-label>Add contacts from the drawer above...</q-item-label>
        </q-item-section>
      </q-item>
    </q-scroll-area>
  </q-list>
</template>

<script>
import ChatListItem from './ChatListItem.vue'
import { mapGetters } from 'vuex'
import formatting from '../../utils/formatting'
import WalletDialog from '../dialogs/WalletDialog.vue'
import WalletConnectDialog from '../dialogs/WalletConnectDialog.vue'
import RelayConnectDialog from '../dialogs/RelayConnectDialog.vue'

export default {
  props: ['chatAddr'],
  components: {
    ChatListItem,
    WalletDialog,
    WalletConnectDialog,
    RelayConnectDialog
  },
  data () {
    return {
      walletOpen: false,
      walletConnectOpen: false,
      relayConnectOpen: false
    }
  },
  methods: {
    formatBalance (balance) {
      if (!balance) {
        return balance
      }
      return formatting.formatBalance(balance)
    }
  },
  computed: {
    ...mapGetters({
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getNumUnread: 'chats/getNumUnread',
      relayConnected: 'relayClient/connected'
    }),
    walletConnected () {
      return this.$electrum.connected
    },
    getBalance () {
      return formatting.formatBalance(this.$wallet.balance)
    }
  }
}
</script>
