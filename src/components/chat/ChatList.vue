<template>
  <div class="full-width column col">
    <q-scroll-area class="q-px-none col">
      <q-list>
        <chat-list-link
          title="Login/Sign Up"
          route="/setup"
          icon="login"
          v-if="!$status.setup"
        />
        <q-separator />
        <q-item>
          <q-item-section>
            <q-item-label>Topics</q-item-label>
          </q-item-section>
          <q-space />
          <q-btn
            dense
            flat
            icon="add"
            @click="() => openPage(this.$router, '/add-topic')"
          />
        </q-item>
        <q-separator />
        <template v-for="topic in topics" :key="topic">
          <topic-list-link :topic="topic" icon="forum" />
        </template>
        <q-separator />
        <q-item>
          <q-item-section>
            <q-item-label>Direct Messages</q-item-label>
          </q-item-section>
          <q-space />
          <q-btn
            dense
            flat
            icon="add"
            @click="() => openPage(this.$router, '/add-contact')"
          />
        </q-item>
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
// FIXME: The current file needs to be moved around and refactored to make sense
// with topics system.
import TopicListLink from '../topic/TopicListLink.vue'
import { formatBalance } from '../../utils/formatting'
import { useChatStore } from '../../stores/chats'
import { useWalletStore } from '../../stores/wallet'
import { useTopicStore } from 'src/stores/topics'

import { openChat, openPage } from '../../utils/routes'

export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    const { getSortedChatOrder } = storeToRefs(chatStore)
    const walletStore = useWalletStore()
    const { balance } = storeToRefs(walletStore)
    const { getTopics } = storeToRefs(useTopicStore())

    return {
      getSortedChatOrder,
      balance,
      topics: getTopics,
      openPage,
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
    TopicListLink,
  },
  data() {
    return {}
  },
  methods: {
    setActiveChat(address: string) {
      openChat(this.$router, address)
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
