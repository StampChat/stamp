<template>
  <div class="full-width column col">
    <q-scroll-area class="q-px-none col">
      <q-list>
        <q-separator />
        <chat-list-link
          title="Stamp News"
          route="/home"
        />
        <chat-list-link
          title="Create/Import Account"
          route="/setup"
          icon="login"
          v-if="!$status.setup"
        />
        <q-separator />
        <template v-if="$status.setup">
          <chat-list-item
            v-for="(contact) in getSortedChatOrder"
            :key="contact.address"
            :chat-address="contact.address"
            :value-unread="formatBalance(contact.totalUnreadValue)"
            :num-unread="contact.totalUnreadMessages"
            :compact="compact"
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

<script>
import ChatListItem from './ChatListItem.vue'
import ChatListLink from './ChatListLink.vue'
import { mapGetters } from 'vuex'
import { formatBalance } from '../../utils/formatting'

export default {
  props: {
    compact: {
      type: Boolean,
      required: true
    }
  },
  emits: ['toggleMyDrawerOpen'],
  components: {
    ChatListItem,
    ChatListLink
  },
  data () {
    return {
    }
  },
  methods: {
    toggleMyDrawerOpen () {
      this.$emit('toggleMyDrawerOpen')
    },
    formatBalance (balance) {
      if (!balance) {
        return
      }
      return formatBalance(balance)
    }
  },
  computed: {
    ...mapGetters({
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getNumUnread: 'chats/getNumUnread',
      balance: 'wallet/balance'
    })
  }
}
</script>
