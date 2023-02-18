<template>
  <div class="full-width column col">
    <q-scroll-area class="q-px-none col">
      <q-list>
        <q-separator />
        <q-item>
          <q-item-section>
            <q-item-label>{{ $t('chatList.directMessages') }}</q-item-label>
          </q-item-section>
          <q-space />
          <q-btn
            dense
            flat
            icon="add"
            @click="() => openPage($router, '/add-contact')"
          />
        </q-item>
        <q-separator />

        <template v-if="$status.setup">
          <chat-list-item
            v-for="contact in getSortedChatOrder"
            :key="contact.address"
            :chat-address="contact.address"
            :value-unread="formatAmount(contact.totalUnreadValue)"
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
import { useChatStore } from '../../stores/chats'

import { openChat, openPage } from '../../utils/routes'
import { useRouter } from 'vue-router'
import { formatBalance } from 'src/utils/formatting'

export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    const { getSortedChatOrder } = storeToRefs(chatStore)

    const router = useRouter()
    return {
      getSortedChatOrder,
      openPage,
      setActiveChat(address: string) {
        openChat(router, address)
      },
      formatAmount(amount?: number) {
        if (!amount) {
          return
        }
        return formatBalance(amount)
      },
    }
  },
  props: {
    compact: {
      type: Boolean,
      required: true,
    },
  },
  components: {
    ChatListItem,
  },
})
</script>

<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
  color: #f0409b;
}
</style>
