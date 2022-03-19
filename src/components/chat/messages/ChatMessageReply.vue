<template>
  <div :class="replyOverlay" @click="$emit('replyDivClick', replyDigest)">
    <div class="q-mb-sm reply">
      <div class="row">
        <div class="col q-pa-sm">
          <!-- Sender Name -->
          <div class="q-mb-xs">
            <b>{{ name }}</b>
          </div>
          <!-- Stealth Message -->
          <chat-message-stealth
            v-if="items.stealth !== undefined"
            :amount="items.stealth.amount"
          />
          <!-- Text Message -->
          <chat-message-text
            v-if="items.text !== undefined"
            class="ellipsis-2-lines"
            :text="items.text.text"
            :is-reply="true"
          />
          <!-- Placeholder text for Image Messages without caption -->
          <chat-message-text
            v-else-if="items.image !== undefined"
            text="Image"
          />
        </div>
        <!-- Image Message -- pull to the right -->
        <div v-if="items.image !== undefined" class="col-auto">
          <chat-message-image :image="items.image.image" :is-reply="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'ChatMessageReply',
  components: {
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
  },
  props: {
    payloadDigest: {
      type: String,
      required: true,
    },
  },
  emits: ['replyDivClick'],
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload',
      getContact: 'contacts/getContact',
    }),
  },
  computed: {
    message() {
      const message = this.getMessageByPayloadVuex()(this.payloadDigest)
      return message || { items: [], senderAddress: undefined }
    },
    replyDigest() {
      return this.message.senderAddress ? this.payloadDigest : null
    },
    forwardedMessage() {
      return this.message.items.find(item => item.type === 'forward')
    },
    items() {
      const sorted = {}
      this.forwardedMessage
        ? this.forwardedMessage.content.map(item => (sorted[item.type] = item))
        : this.message.items.map(item => (sorted[item.type] = item))
      return sorted
    },
    name() {
      // get sender name of forwarded message
      if (this.forwardedMessage) {
        return 'Forwarded from ' + this.forwardedMessage.from
      }
      const sender = this.message.senderAddress
      // if senderAddress undefined, assume deleted message
      if (!sender) {
        return 'Message not found'
      }
      if (sender === this.$wallet.myAddress.toXAddress()) {
        return 'You'
      }
      const contact = this.getContact()(sender)
      if (!contact) {
        return 'Not Found'
      }
      return contact.profile.name
    },
    // colorize the reply div to match source sender
    replyOverlay() {
      return this.message.outbound ? 'message-color-sent' : 'message-color'
    },
  },
}
</script>

<style lang="scss" scoped>
.reply {
  background: var(--q-reply-bg);
  border-left: var(--q-reply-border-left);
}
</style>
