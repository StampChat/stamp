<template>
  <div
    class="q-mb-sm q-px-sm q-py-sm"
    style="border-left: 4px solid black; background-color: rgba(0, 0, 0, 0.21);"
  >
    <!-- Redundant to show for stealth messages -->
    <div
      v-show="messageType !== 'stealth'"
      class="row q-mt-xs q-py-xs"
    >
      <b>{{ name }}</b>
    </div>
    <chat-message-text
      v-if="messageType === 'text'"
      :text="messageItem.text"
    />
    <chat-message-image
      v-else-if="messageType === 'image'"
      :image="messageItem.image"
      width="160px"
    />
    <chat-message-stealth
      v-else-if="messageType === 'stealth'"
      :outbound="message.outbound"
      :amount="messageItem.amount"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { renderMarkdown } from '../../../utils/markdown'
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'

export default {
  name: 'ChatMessageReply',
  components: {
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth
  },
  data () {
    return {
    }
  },
  props: {
    /*
    address: {
      type: String,
      required: false
    },
    mouseover: {
      type: Boolean,
      required: false
    },
    */
    payloadDigest: {
      type: String,
      required: true
    }
  },
  emits: ['replyMounted'],
  mounted () {
    this.$emit('replyMounted')
  },
  unmounted () {
    this.$emit('replyMounted')
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
    markedMessage () {
      return renderMarkdown(this.messageItem.text)
    },
    message () {
      const message = this.getMessageByPayloadVuex()(this.payloadDigest)
      return message || { items: [], senderAddress: undefined }
    },
    messageItem () {
      // Get the last item from the message, in case it is also a reply
      // to a different message that we don't care about
      return this.message.items[this.message.items.length - 1]
    },
    messageType () {
      return this.messageItem.type
    },
    name () {
      if (this.message.senderAddress === this.$wallet.myAddress.toXAddress()) {
        return 'You' // this.getProfile.name
      }
      const contact = this.getContact()(this.message.senderAddress)
      if (!contact) {
        return 'Not Found'
      }
      return contact.profile.name
    }/* ,
    nameColor () {
      if (this.message.senderAddress === this.$wallet.myAddress.toXAddress()) {
        return 'text-black'
      }
      return addressColorFromStr(this.address)
    }
    */
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
