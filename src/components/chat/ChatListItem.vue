<template>
  <q-item
    :active="isActive"
    active-class="active-chat-list-item"
    clickable
    @click="setActiveChat(chatAddress)"
  >
    <q-item-section
      avatar
      v-if="loaded"
    >
      <q-avatar rounded>
        <img :src="contact.avatar">
        <q-badge
          v-show="compact"
          v-if="!!numUnread"
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
        v-if="!!valueUnread "
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
    ...mapActions({ vuexSetActiveChat: 'chats/setActiveChat' }),
    setActiveChat (newAddress) {
      this.vuexSetActiveChat(newAddress)
      this.$router.push(`/chat/${newAddress}`).catch(() => {
        // Don't care. Probably duplicate route
      })
    }
  },
  computed: {
    ...mapGetters({
      getContactProfile: 'contacts/getContactProfile',
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
      return this.$route.params.address === this.chatAddress
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
      type: String,
      // Not passed when all read
      required: false,
      default: () => ''
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
