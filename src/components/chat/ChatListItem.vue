<template>
  <q-item
    :active="isActive"
    :active-class="`${$q.dark.isActive ? 'bg-blue-grey-10 text-white' : 'bg-blue-2 text-black'}`"
    clickable
    @click="setActiveChat(chatAddr)"
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
      >{{ latestMessageBody }}</q-item-label>
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
      const info = this.getLatestMessage(this.chatAddr)
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
      return this.getContactProfile(this.chatAddr)
    },
    isActive () {
      return this.getActiveChat === this.chatAddr
    }
  },
  props: {
    chatAddr: {
      type: String,
      required: true
    },
    numUnread: {
      type: Number,
      // Not passed when all read
      required: false
    },
    valueUnread: {
      type: String,
      // Not passed when all read
      required: false
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
