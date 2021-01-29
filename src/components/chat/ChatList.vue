<template>
  <div class="full-width column col">
    <q-scroll-area class="q-px-none col">
      <q-list>
        <q-separator />
        <chat-list-link
          title="Stamp News"
          route="/"
        />
        <q-separator />
        <chat-list-item
          v-for="(contact) in getSortedChatOrder"
          :key="contact.address"
          :chat-address="contact.address"
          :value-unread="formatBalance(contact.totalUnreadValue)"
          :num-unread="contact.totalUnreadMessages"
          :loaded="loaded"
          :compact="compact"
        />
        <q-item v-if="getSortedChatOrder.length === 0">
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
