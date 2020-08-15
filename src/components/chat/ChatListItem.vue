<template>
  <q-item
    :active="isActive"
    active-class="active-chat-list-item"
    clickable
    @click="setActiveChat(chatAddress)"
  >
    <q-item-section avatar>
      <q-avatar rounded>
        <img :src="contact.avatar">
        <q-badge
          v-show="compact"
          v-if="!!numUnread && loaded"
          floating
          color="secondary"
          :label="numUnread"
          class="q-my-xs"
        />
      </q-avatar>
    </q-item-section>
    <q-item-section v-show="!compact">
      <q-item-label>{{ contact.name }}</q-item-label>
      <q-item-label
        caption
        lines="2"
        v-if="loaded"
      >
        {{ latestMessageBody }}
      </q-item-label>
    </q-item-section>
    <q-item-section
      v-show="!compact"
      side
      top
    >
      <q-badge
        v-if="!!valueUnread && loaded"
        color="primary"
        :label="valueUnread"
        class="q-my-xs"
      />
      <q-badge
        v-if="!!numUnread && loaded"
        color="secondary"
        :label="numUnread"
        class="q-my-xs"
      />
    </q-item-section>
  </q-item>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  methods: {
    ...mapActions({ setActiveChat: 'chats/setActiveChat' })
  },
  computed: {
    ...mapGetters({
      getContactProfile: 'contacts/getContactProfile',
      getActiveChat: 'chats/getActiveChat',
      getLatestMessage: 'chats/getLatestMessage'
    }),
    latestMessageBody () {
      const info = this.getLatestMessage(this.chatAddress)
      if (info === null) {
        return ''
      }
      if (info.outbound) {
        return 'You: ' + info.text
      } else {
        return this.contact.name + ': ' + info.text
      }
    },
    contact () {
      return this.getContactProfile(this.chatAddress)
    },
    isActive () {
      return this.getActiveChat === this.chatAddress
    }
  },
  props: {
    chatAddress: {
      type: String,
      required: true
    },
    numUnread: {
      type: Number,
      // Not passed when all read
      required: false,
      default: () => 0
    },
    valueUnread: {
      type: Number,
      // Not passed when all read
      required: false,
      default: () => 0
    },
    loaded: {
      type: Boolean,
      required: true
    },
    compact: {
      type: Boolean,
      required: true
    }
  }
}
</script>
<style lang="scss" scoped>
.active-chat-list-item {
    background: var(--q-color-bg-active);
}
</style>
