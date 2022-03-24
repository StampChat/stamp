<template>
  <div
    style="width: 100%"
    @mouseover="mouseoverCheckMobile()"
    @mouseleave="provided.mouseover = false"
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
        :payload-digest="payloadDigest"
        :index="index"
      />
    </q-dialog>

    <!-- Forward Dialog -->
    <q-dialog v-model="forwardDialog">
      <forward-message-dialog
        :payload-digest="payloadDigest"
        :title="$t('forwardMessageDialog.title')"
      />
    </q-dialog>

    <template v-if="payloadDigest">
      <q-chat-message
        :sent="message.outbound"
        :size="bubbleSize"
        :bg-color="bgColor"
        :text-color="textColor"
        v-touch-swipe.touch.right="swipeRight"
      >
        <!-- Wrap a div around the template to keep all items within 1 QChatMessasge -->
        <div>
          <template v-for="(item, subIndex) in message.items" :key="subIndex">
            <chat-message-forward
              v-if="item.type == 'forward'"
              :senderName="item.senderName"
              :senderAddress="item.senderAddress"
              :items="item.items"
            />
            <chat-message-reply
              v-else-if="item.type == 'reply'"
              :payload-digest="item.payloadDigest"
              @replyDivClick="handleReplyDivClick"
            />
            <chat-message-stealth
              v-else-if="item.type == 'stealth'"
              :amount="item.amount"
            />
            <chat-message-image
              v-else-if="item.type == 'image'"
              :image="item.image"
            />
            <chat-message-text
              v-else-if="item.type == 'text'"
              :text="item.text"
            />
          </template>
        </div>
        <template #stamp>
          <chat-message-suffix
            :status="message.status"
            :stamp="shortTimestamp"
            :amount="stampAmount"
            :outbound="message.outbound"
            @infoClick="transactionDialog = true"
            @deleteClick="deleteDialog = true"
            @forwardClick="forwardDialog = true"
            @replyClick="replyClicked({ address, payloadDigest })"
            @resendClick="resend()"
          />
        </template>
      </q-chat-message>
    </template>
    <div class="col" v-else-if="!payloadDigest">
      Unable to find message payload
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import ChatMessageForward from './ChatMessageForward.vue'
import ChatMessageReply from './ChatMessageReply.vue'
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import ChatMessageSuffix from './ChatMessageSuffix.vue'
import DeleteMessageDialog from '../../dialogs/DeleteMessageDialog.vue'
import TransactionDialog from '../../dialogs/TransactionDialog.vue'
import ForwardMessageDialog from '../../dialogs/ForwardMessageDialog.vue'
import { stampPrice } from '../../../cashweb/wallet/helpers'
import { mapMutations, mapGetters } from 'vuex'

export default {
  name: 'ChatMessage',
  components: {
    ChatMessageForward,
    ChatMessageReply,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    ChatMessageSuffix,
    TransactionDialog,
    DeleteMessageDialog,
    ForwardMessageDialog,
  },
  emits: ['replyClicked', 'replyDivClick'],
  data() {
    return {
      transactionDialog: false,
      deleteDialog: false,
      forwardDialog: false,
      provided: {
        mouseover: false,
      },
      // reactiveTimestamp: this.howLongAgo(),
      // reactiveTimestampInterval: null
    }
  },
  props: {
    address: {
      type: String,
      required: true,
    },
    message: {
      type: Object,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    chatWidth: {
      type: Number,
      required: true,
    },
    // Payload digest and index are not passed when nested in a reply
    payloadDigest: {
      type: String,
      required: false,
      default: () => '',
    },
    index: {
      type: Number,
      required: false,
      default: () => -1,
    },
  },
  provide() {
    return {
      provided: this.provided,
    }
  },
  methods: {
    ...mapMutations({
      deleteMessage: 'chats/deleteMessage',
    }),
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount',
    }),
    handleReplyDivClick(args) {
      this.$emit('replyDivClick', args)
    },
    swipeRight() {
      this.replyClicked({
        address: this.address,
        payloadDigest: this.payloadDigest,
      })
    },
    resend() {
      this.deleteMessage({
        address: this.address,
        payloadDigest: this.payloadDigest,
        index: this.index,
      })
      const stampAmount = this.getStampAmount()(this.address)
      return this.$relayClient.sendMessageImpl({
        address: this.address,
        items: this.message.items,
        stampAmount,
      })
    },
    replyClicked(args) {
      this.$emit('replyClicked', args)
    },
    mouseoverCheckMobile() {
      // only set mouseover if not on mobile
      this.provided.mouseover = !this.$q.platform.is.mobile
    },
  },
  computed: {
    forwardedMessage() {
      return this.message.items.find(item => item.type == 'forward')
    },
    items() {
      const sorted = {}
      this.forwardedMessage
        ? this.forwardedMessage.items.map(item => (sorted[item.type] = item))
        : this.message.items.map(item => (sorted[item.type] = item))
      return sorted
    },
    bubbleSize() {
      // Default chatbubble size; assume small screen
      let base = 9
      let textLen = 50
      // Reduce base chatbubble size as chat width increases
      if (this.chatWidth > 720 && this.chatWidth <= 1080) {
        base = 6
      } else if (this.chatWidth > 1080 && this.chatWidth <= 1440) {
        base = 4
        textLen = 70
      } else if (this.chatWidth > 1440) {
        base = 3
        textLen = 70
      }
      const text = this.items.text?.text
      const image = this.items.image?.image
      const reply = this.items.reply?.payloadDigest
      if ((text && text.length >= textLen) || image) {
        base += 1
        return String(base)
      } else if (reply) {
        base -= 1
        return String(base)
      }
      return null
    },
    shortTimestamp() {
      switch (this.message.status) {
        case 'confirmed': {
          const timestamp = this.message.timestamp || this.message.serverTime
          // return moment(timestamp).fromNow(true)
          const howLongAgo = moment(timestamp)
          return howLongAgo.calendar(null, {
            sameDay: 'HH:mm:ss',
            nextDay: '[Tomorrow] HH:mm:ss',
            nextWeek: '[Next] ddd',
            lastDay: '[Yest.] HH:mm',
            lastWeek: 'ddd HH:mm',
            sameElse: 'DD/MM/YYYY',
          })
        }
        case 'pending':
          return 'sending...'
        case 'error':
          return ''
      }
      return 'N/A'
    },
    stampAmount() {
      if (!this.message || !this.message.outpoints) {
        return '0 XPI'
      }
      const amount = stampPrice(this.message.outpoints)
      return Number(amount / 1000000).toFixed(2) + ' XPI'
    },
    bgColor() {
      const isDark = this.$q.dark.isActive
      if (this.message.outbound) {
        return isDark ? 'deep-purple' : 'deep-purple-2'
      } else {
        return isDark ? 'blue-grey-8' : 'blue-grey-2'
      }
    },
    textColor() {
      return this.$q.dark.isActive ? 'white' : 'black'
    },
  },
}
</script>
