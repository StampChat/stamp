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
  </q-item>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  methods: {
    ...mapGetters({ getActiveChat: 'chats/getActiveChat', getProfile: 'contacts/getProfile', getLatestMessageBody: 'chats/getLatestMessageBody' }),
    ...mapActions({ switchChatActive: 'chats/switchChatActive' })
  },
  computed: {
    latestMessageBody () {
      return this.getLatestMessageBody()(this.chatAddr)
    },
    profile () {
      return this.getProfile()(this.chatAddr)
    },
    isActive () {
      return this.getActiveChat() === this.chatAddr
    }
  },
  props: ['chatAddr']
}
</script>
