<template>
  <div
    style="width: 100%"
    @mouseover="mouseover = true"
    @mouseleave="mouseover = false"
  >
    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog
        title="Backing Transactions"
        :outpoints="message.outpoints"
      />
    </q-dialog>

    <!-- Delete Dialog -->
    <q-dialog v-model="deleteDialog">
      <delete-message-dialog
        :address="address"
        :payload-digest="message.payloadDigest"
        :index="index"
      />
    </q-dialog>

    <chat-message-menu
      v-if="message.payloadDigest"
      :address="address"
      :message="message"
      :payload-digest="message.payloadDigest"
      :index="index"
      @txClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, payloadDigest: message.payloadDigest })"
    />
    <div
      v-if="message.payloadDigest"
    >
      <div
        v-if="messageItem.type === 'stealth'"
      >
        <chat-message-stealth
          :amount="messageItem.amount"
          :outbound="message.outbound"
        />
      </div>
      <!-- Sent Message -->
      <q-chat-message
        v-else-if="message.outbound"
        sent
      >
        <div>
          <chat-message-reply
            v-if="replyItem.payloadDigest !== ''"
            :payload-digest="replyItem.payloadDigest"
          />
          <chat-message-text
            v-if="messageItem.type === 'text'"
            :text="messageItem.text"
          />
          <chat-message-image
            v-else-if="messageItem.type === 'image'"
            :image="messageItem.image"
          />
        </div>
        <template
          #stamp
        >
          <chat-message-suffix
            :status="message.status"
            :stamp="reactiveTimestamp"
            :amount="stampAmount"
          />
        </template>
      </q-chat-message>
      <!-- Received Message -->
      <q-chat-message
        v-else
      >
        <div>
          <chat-message-reply
            v-if="replyItem.payloadDigest !== ''"
            :payload-digest="replyItem.payloadDigest"
          />
          <chat-message-text
            v-if="messageItem.type === 'text'"
            :text="messageItem.text"
          />
          <chat-message-image
            v-else-if="messageItem.type === 'image'"
            :image="messageItem.image"
          />
        </div>
        <template
          #stamp
        >
          <chat-message-suffix
            :status="message.status"
            :stamp="reactiveTimestamp"
            :amount="stampAmount"
          />
        </template>
      </q-chat-message>
    </div>
    <div
      class="col"
      v-else-if="!message.payloadDigest"
    >
      Unable to find message payload
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import ChatMessageMenu from '../../context_menus/ChatMessageMenu.vue'
import ChatMessageReply from './ChatMessageReply.vue'
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import ChatMessageSuffix from './ChatMessageSuffix.vue'
import DeleteMessageDialog from '../../dialogs/DeleteMessageDialog.vue'
import TransactionDialog from '../../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../../cashweb/wallet/helpers'

export default {
  name: 'ChatMessage',
  components: {
    ChatMessageMenu,
    ChatMessageReply,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    ChatMessageSuffix,
    TransactionDialog,
    DeleteMessageDialog
  },
  emits: ['replyClicked'],
  data () {
    return {
      isLastMessageItem: false,
      transactionDialog: false,
      deleteDialog: false,
      mouseover: false,
      reactiveTimestamp: this.howLongAgo(),
      messageTimestampInterval: null
    }
  },
  props: {
    address: {
      type: String,
      required: true
    },
    message: {
      type: Object,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    // Payload digest and index are not passed when nested in a reply
    payloadDigest: {
      type: String,
      required: false,
      default: () => ''
    },
    index: {
      type: Number,
      required: false,
      default: () => 0
    }
  },
  methods: {
    replyClicked (args) {
      this.$emit('replyClicked', args)
    },
    howLongAgo () {
      switch (this.message.status) {
        case 'confirmed': {
          const timestamp = this.message.timestamp || this.message.serverTime
          // return moment(timestamp).fromNow(true)
          const howLongAgo = moment(timestamp)
          return howLongAgo.fromNow(true)
        }
        case 'pending':
          return 'sending...'
        case 'error':
          return ''
      }
      return 'N/A'
    }
  },
  mounted () {
    this.messageTimestampInterval = setInterval(() => {
      this.reactiveTimestamp = this.howLongAgo()
    }, 500)
  },
  unmounted () {
    clearInterval(this.messageTimestampInterval)
  },
  computed: {
    // Top-most non-reply message item
    messageItem () {
      return this.message.items.find(item => item.type !== 'reply')
    },
    // Top-most reply message item
    replyItem () {
      // return empty payloadDigest string if reply doesn't exist
      return this.message.items.find(item => item.type === 'reply') || { payloadDigest: '' }
    },
    stampAmount () {
      if (!this.message || !this.message.outpoints) {
        return '0 XPI'
      }
      const amount = stampPrice(this.message.outpoints)
      return Number(amount / 1000000).toFixed(2) + ' XPI'
    }
  }
}
</script>
