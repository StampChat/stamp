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
    </q-item>
    <q-separator />
    <chat-list-item
      v-for="(addr, index) in getChatOrder"
      :key="index"
      :chatAddr="addr"
      :numUnread="getNumUnread(addr)"
    />
    <q-item v-if="getChatOrder.length === 0">
      <q-item-section>
        <q-item-label>Add contacts from the drawer above...</q-item-label>
      </q-item-section>
    </q-item>
    <q-item>

    </q-item>
  </q-list>
</template>

<script>
import ChatListItem from './ChatListItem.vue'
import { mapGetters } from 'vuex'
import formatting from '../../utils/formatting'
import WalletDialog from '../dialogs/WalletDialog.vue'
import WalletConnectDialog from '../dialogs/WalletConnectDialog.vue'

export default {
  components: {
    ChatListItem,
    WalletDialog,
    WalletConnectDialog
  },
  data () {
    return {
      walletOpen: false,
      walletConnectOpen: false
    }
  },
  computed: {
    ...mapGetters({
      getChatOrder: 'chats/getChatOrder',
      getNumUnread: 'chats/getNumUnread',
      getBalanceVuex: 'wallet/getBalance',
      walletConnected: 'electrumHandler/connected'
    }),
    getBalance () {
      return formatting.formatBalance(this.getBalanceVuex)
    }
  },
  props: ['chatAddr']
}
</script>
