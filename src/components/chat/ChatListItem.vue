<template>
  <q-item
    :active="isActive"
    active-class="bg-blue-3 text-black"
    clickable
    v-ripple
    @click="switchChatActive(chatAddr)"
  >
    <q-item-section avatar>
      <q-avatar rounded>
        <img :src="profile.avatar">
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ profile.name }}</q-item-label>
      <q-item-label
        caption
        lines="2"
      >{{ latestMessageBody }}</q-item-label>
    </q-item-section>
    <q-item-section
      v-if="numUnread !== 0"
      side
      top
    >
      <q-badge
        color="info"
        :label="numUnread"
      />
    </q-item-section>
  </q-item>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  methods: {
    ...mapGetters({
      getActiveChat: 'chats/getActiveChat',
      getContact: 'contacts/getContact',
      getLatestMessage: 'chats/getLatestMessage'
    }),
    ...mapActions({ switchChatActive: 'chats/switchChatActive' })
  },
  computed: {
    latestMessageBody () {
      let info = this.getLatestMessage()(this.chatAddr)
      if (info === null) {
        return ''
      }
      if (info.outbound) {
        return 'You: ' + info.text
      } else {
        return this.profile.name + ': ' + info.text
      }
    },
    profile () {
      return this.getContact()(this.chatAddr)
    },
    isActive () {
      return this.getActiveChat() === this.chatAddr
    }
  },
  props: ['chatAddr', 'numUnread']
}
</script>
