<template>
  <div class="full-width column col">
    <q-scroll-area class="q-px-none col">
      <q-list>
        <q-separator />
        <chat-list-link
          title="Forum"
          route="/forum"
          icon="forum"
          @click="setActiveChat(undefined)"
        />
        <chat-list-link title="Crypto" route="/topic/crypto" icon="forum" />
        <chat-list-link
          title="Login/Sign Up"
          route="/setup"
          icon="login"
          v-if="!$status.setup"
        />
        <q-separator />
        <template v-if="$status.setup">
          <chat-list-item
            v-for="contact in getSortedChatOrder"
            :key="contact.address"
            :chat-address="contact.address"
            :value-unread="formatBalance(contact.totalUnreadValue)"
            :num-unread="contact.totalUnreadMessages"
            :compact="compact"
            @click="setActiveChat(contact.address)"
          />
        </template>
        <q-item v-if="getSortedChatOrder.length === 0 && $status.setup">
          <q-item-section>
            <q-item-label>{{ $t('chatList.noContactMessage') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'

import ChatListItem from './ChatListItem.vue'
import ChatListLink from './ChatListLink.vue'
import { formatBalance } from '../../utils/formatting'
import { useChatStore } from '../../stores/chats'
import { useWalletStore } from '../../stores/wallet'

export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    const { getSortedChatOrder } = storeToRefs(chatStore)
    const walletStore = useWalletStore()
    const { balance } = storeToRefs(walletStore)

    return {
      getSortedChatOrder,
      balance,
      setStoredActiveChat: chatStore.setActiveChat,
    }
  },
  props: {
    compact: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['toggleMyDrawerOpen'],
  components: {
    ChatListItem,
    ChatListLink,
  },
  data() {
    return {}
  },
  methods: {
    setActiveChat(address: string) {
      this.setStoredActiveChat(address)
    },
    toggleMyDrawerOpen() {
      this.$emit('toggleMyDrawerOpen')
    },
    formatBalance(balance?: number) {
      if (!balance) {
        return
      }
      return formatBalance(balance)
    },
  },
})
</script>

<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
  color: #f0409b;
}
</style>
