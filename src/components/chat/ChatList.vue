<template>
  <div class="column full-height">
    <!-- Wallet dialog -->
    <q-dialog v-model="walletOpen">
      <wallet-dialog />
    </q-dialog>

    <!-- Relay reconnect dialog -->
    <q-dialog v-model="relayConnectOpen">
      <relay-connect-dialog />
    </q-dialog>

    <!-- New contact dialog -->
    <q-dialog v-model="newContactOpen">
      <new-contact-dialog />
    </q-dialog>

    <q-toolbar>
      <q-btn
        class="q-px-sm"
        flat
        dense
        @click="toggleMyDrawerOpen"
        icon="menu"
      />
      <q-space />
      <q-btn
        v-if="!compact"
        class="q-px-sm"
        flat
        dense
        @click="newContactOpen = true"
        icon="add"
      />
    </q-toolbar>
    <q-scroll-area class="q-px-none col">
      <q-list>
        <q-separator />
        <chat-list-item
          v-for="(contact) in getSortedChatOrder"
          :key="contact.address"
          :chatAddress="contact.address"
          :valueUnread="formatBalance(contact.totalUnreadValue)"
          :numUnread="contact.totalUnreadMessages"
          :loaded="loaded"
          :compact="compact"
        />
        <q-item v-if="getSortedChatOrder.length === 0">
          <q-item-section>
            <q-item-label>Add contacts from the drawer above...</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
    <q-list>
      <q-separator />
      <q-item
        v-show="!compact"
        clickable
        @click="walletOpen=true"
      >
        <q-item-section>
          <q-item-label>Balance</q-item-label>
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
import ChatListItem from './ChatListItem.vue'
import { mapGetters } from 'vuex'
import { formatBalance } from '../../utils/formatting'
import WalletDialog from '../dialogs/WalletDialog.vue'
import NewContactDialog from '../dialogs/NewContactDialog.vue'
import RelayConnectDialog from '../dialogs/RelayConnectDialog.vue'

export default {
  props: {
    loaded: {
      type: Boolean,
      required: true
    },
    compact: {
      type: Boolean,
      required: true
    }
  },
  components: {
    ChatListItem,
    WalletDialog,
    RelayConnectDialog,
    NewContactDialog
  },
  data () {
    return {
      walletOpen: false,
      relayConnectOpen: false,
      newContactOpen: false
    }
  },
  methods: {
    formatBalance (balance) {
      if (!balance) {
        return
      }
      return formatBalance(balance)
    },
    toggleMyDrawerOpen () {
      this.$emit('toggleMyDrawerOpen')
    }
  },
  computed: {
    ...mapGetters({
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
