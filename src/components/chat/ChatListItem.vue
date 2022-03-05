<template>
  <q-item :active="isActive" active-class="active-chat-list-item" clickable>
    <q-item-section avatar v-if="$status.setup" side>
      <q-avatar rounded>
        <img :src="contact.avatar" />
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
      <q-item-label caption lines="2">
        {{ latestMessageBody }}
      </q-item-label>
    </q-item-section>
    <q-item-section v-show="!compact" side>
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
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      getContactProfile: 'contacts/getContactProfile',
      getLatestMessage: 'chats/getLatestMessage',
    }),
    latestMessageBody() {
      const info = this.getLatestMessage(this.chatAddress)
      if (info === null) {
        return ''
      }
      const slicedText = info.text
        .split(' ')
        .map(word => word.slice(0, 15))
        .join(' ')
      if (info.outbound) {
        return 'You: ' + slicedText
      } else {
        return 'Them: ' + slicedText
      }
    },
    contact() {
      return this.getContactProfile(this.chatAddress)
    },
    isActive() {
      return this.$route.params.address === this.chatAddress
    },
  },
  props: {
    chatAddress: {
      type: String,
      required: true,
    },
    numUnread: {
      type: Number,
      // Not passed when all read
      required: false,
      default: () => 0,
    },
    valueUnread: {
      type: String,
      // Not passed when all read
      required: false,
      default: () => '',
    },
    compact: {
      type: Boolean,
      required: true,
    },
  },
}
</script>
