<template>
  <div style="width: 100%">
    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog
        :title="$t('transactionDialog.backingTransactions')"
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
            <chat-message-reply
              v-if="item.type == 'reply'"
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
            @replyClick="replyClicked({ address, payloadDigest })"
            @resendClick="resend()"
          />
        </template>
      </q-chat-message>
    </template>
    <div class="col" v-else-if="!payloadDigest">
      {{ $t('chatMessage.noPayloadFound') }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

import { useChatStore } from '../../../stores/chats'

import moment from 'moment'
import ChatMessageReply from './ChatMessageReply.vue'
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import ChatMessageSuffix from './ChatMessageSuffix.vue'
import DeleteMessageDialog from '../../dialogs/DeleteMessageDialog.vue'
import TransactionDialog from '../../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../../cashweb/wallet/helpers'
import { Message, MessageItem } from 'src/cashweb/types/messages'

export default defineComponent({
  name: 'ChatMessage',
  components: {
    // ChatMessageMenu,
    ChatMessageReply,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    ChatMessageSuffix,
    TransactionDialog,
    DeleteMessageDialog,
  },
  emits: ['replyClicked', 'replyDivClick'],
  data() {
    return {
      transactionDialog: false,
      deleteDialog: false,
    }
  },
  setup() {
    const chats = useChatStore()
    return {
      deleteMessage: chats.deleteMessage,
      getStampAmount: chats.getStampAmount,
    }
  },
  props: {
    address: {
      type: String,
      required: true,
    },
    message: {
      type: Object as PropType<Message>,
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
  methods: {
    handleReplyDivClick(args: string) {
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
      })
      const stampAmount = this.getStampAmount(this.address)
      return this.$relayClient.sendMessageImpl({
        address: this.address,
        items: this.message.items,
        stampAmount,
      })
    },
    replyClicked(args: { address: string; payloadDigest: string }) {
      this.$emit('replyClicked', args)
    },
  },
  computed: {
    items() {
      const sorted: {
        text?: MessageItem
        image?: MessageItem
        reply?: MessageItem
        stealth?: MessageItem
        p2pkh?: MessageItem
      } = {}
      this.message.items.map(item => (sorted[item.type] = item))
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
      const text = this.items.text?.type === 'text' ? this.items.text?.text : ''
      const image =
        this.items.image?.type === 'image' ? this.items.image?.image : ''
      const reply =
        this.items.reply?.type === 'reply'
          ? this.items.reply?.payloadDigest
          : ''
      if ((text && text.length >= textLen) || image) {
        base += 1
      } else if (reply) {
        base -= 1
      }
      return String(base)
    },
    shortTimestamp() {
      switch (this.message.status) {
        case 'confirmed': {
          const timestamp = this.message.serverTime
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
})
</script>
