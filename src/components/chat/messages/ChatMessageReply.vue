<template>
  <div
    :style="{'background-color': outerDiv }"
    @click="$emit('replyDivClick', emittedDigest)"
  >
    <div
      class="q-mb-sm"
      :style="{'border-left': colors.border, 'background-color': colors.bg}"
    >
      <div
        class="row"
      >
        <div class="col q-px-sm q-py-sm">
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
          <!-- Placeholder for Image Messages without text -->
          <chat-message-text
            v-else-if="items.image !== undefined"
            text="Image"
          />
        </div>
        <!-- Image Message -- pull to the right -->
        <div
          v-if="items.image !== undefined"
          class="col-auto"
        >
          <chat-message-image
            :image="items.image.image"
            :is-reply="true"
          />
        </div>
      </div>
      <!--
      <chat-message-text
        v-if="messageType === 'text'"
        :text="messageItem.text"
      />
      <chat-message-image
        v-else-if="messageType === 'image'"
        :image="messageItem.image"
        width="120px"
      />
      <chat-message-stealth
        v-else-if="messageType === 'stealth'"
        :name="name"
        :outbound="message.outbound"
        :amount="messageItem.amount"
      />
      -->
    </div>
  </div>
</template>

<script>
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import { mapGetters } from 'vuex'
import { messageBackgroundColor } from '../../../utils/formatting'
import { colors } from 'quasar'
const { getPaletteColor } = colors

export default {
  name: 'ChatMessageReply',
  components: {
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth
  },
  props: {
    payloadDigest: {
      type: String,
      required: true
    }
  },
  emits: ['replyDivClick'],
  data () {
    return {
      colors: {
        border: '4px solid ' + (this.$q.dark.isActive ? 'white' : 'black'),
        bg: (this.$q.dark.isActive ? 'rgba(0, 0, 0, 0.44)' : 'rgba(255, 255, 255, 0.44)')
      }
    }
  },
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload',
      getContact: 'contacts/getContact'
    })
  },
  computed: {
    ...mapGetters({
      getProfile: 'myProfile/getProfile'
    }),
    message () {
      const message = this.getMessageByPayloadVuex()(this.payloadDigest)
      return message || { items: [], senderAddress: undefined }
    },
    emittedDigest () {
      return this.message.senderAddress ? this.payloadDigest : null
    },
    items () {
      const sorted = {}
      for (let i = 0; i < this.message.items.length; i++) {
        const item = this.message.items[i]
        sorted[item.type] = item
      }
      return sorted
    },
    messageItem () {
      // Get the last item from the message
      // We don't care about additional replies
      return this.message.items[this.message.items.length - 1]
    },
    messageType () {
      return this.messageItem.type
    },
    name () {
      // if senderAddress undefined, assume deleted message
      const sender = this.message.senderAddress
      if (!sender) {
        return 'Message not found'
      }
      if (sender === this.$wallet.myAddress.toXAddress()) {
        return 'You' // this.getProfile.name
      }
      const contact = this.getContact()(sender)
      if (!contact) {
        return 'Not Found'
      }
      return contact.profile.name
    },
    // colorize the reply div to match source sender
    outerDiv () {
      const color = messageBackgroundColor(this.message.outbound, this.$q.dark.isActive)
      return getPaletteColor(color)
    }
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}
</style>
