<template>
  <q-item
    :active="isActive"
    active-class="bg-blue-3 text-black"
    clickable
    v-ripple
    @click="setActiveChat(chatAddr)"
  >
    <q-item-section avatar>
      <q-avatar rounded>
        <img :src="contact.avatar">
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ contact.name }}</q-item-label>
      <q-item-label
        caption
        lines="2"
      >{{ latestMessageBody }}</q-item-label>
    </q-item-section>
    <q-item-section
      side
      top
    >
      <q-badge
        v-if="!!valueUnread"
        color="primary"
        :label="valueUnread"
        class="q-my-xs"
      />
      <q-badge
        v-if="!!numUnread"
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
      let info = this.getLatestMessage(this.chatAddr)
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
  props: ['chatAddr', 'numUnread', 'valueUnread']
}
</script>
