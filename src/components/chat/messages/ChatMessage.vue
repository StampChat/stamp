<template>
  <div
    style="width: 100%"
    @mouseover="mouseoverCheckMobile()"
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
    <!--
    <chat-message-menu
      v-if="message.payloadDigest"
      :address="address"
      :message="message"
      :payload-digest="message.payloadDigest"
      :index="index"
      @infoClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, payloadDigest: message.payloadDigest })"
    />
    -->
    <template
      v-if="message.payloadDigest"
    >
      <q-chat-message
        :sent="message.outbound"
        :size="bubbleSize"
        :bg-color="bgColor"
        :text-color="textColor"
        v-touch-swipe.touch.right="swipeRight"
      >
        <!-- Wrap a div around the template to keep all items within 1 QChatMessasge -->
        <div>
          <template
            v-for="(item, subIndex) in message.items"
            :key="subIndex"
          >
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
        <template
          #stamp
        >
          <chat-message-suffix
            :status="message.status"
            :stamp="shortTimestamp"
            :amount="stampAmount"
            :outbound="message.outbound"
            :hovered="mouseover"
            @infoClick="transactionDialog = true"
            @deleteClick="deleteDialog = true"
            @replyClick="replyClicked({ address, payloadDigest: message.payloadDigest })"
            @resendClick="resend()"
          />
        </template>
      </q-chat-message>
    </template>
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
// import ChatMessageMenu from '../../context_menus/ChatMessageMenu.vue'
import ChatMessageReply from './ChatMessageReply.vue'
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import ChatMessageSuffix from './ChatMessageSuffix.vue'
import DeleteMessageDialog from '../../dialogs/DeleteMessageDialog.vue'
import TransactionDialog from '../../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../../cashweb/wallet/helpers'
import { messageBackgroundColor } from '../../../utils/formatting'
import { mapMutations, mapGetters } from 'vuex'

export default {
  name: 'ChatMessage',
  components: {
    // ChatMessageMenu,
    ChatMessageReply,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    ChatMessageSuffix,
    TransactionDialog,
    DeleteMessageDialog
  },
  emits: ['replyClicked', 'replyDivClick'],
  data () {
    return {
      transactionDialog: false,
      deleteDialog: false,
      mouseover: false
      // reactiveTimestamp: this.howLongAgo(),
      // reactiveTimestampInterval: null
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
      default: () => -1
    }
  },
  methods: {
    ...mapMutations({
      deleteMessage: 'chats/deleteMessage'
    }),
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount'
    }),
    handleReplyDivClick (args) {
      this.$emit('replyDivClick', args)
    },
    swipeRight () {
      this.replyClicked({ address: this.address, payloadDigest: this.message.payloadDigest })
    },
    resend () {
      this.deleteMessage({ address: this.address, payloadDigest: this.payloadDigest, index: this.index })
      const stampAmount = this.getStampAmount()(this.address)
      return this.$relayClient.sendMessageImpl({ address: this.address, items: this.message.items, stampAmount })
    },
    replyClicked (args) {
      this.$emit('replyClicked', args)
    },
    mouseoverCheckMobile () {
      // only set mouseover if not on mobile
      this.mouseover = !this.$q.platform.is.mobile
    }
  },
  mounted () {
    // console.log('ChatMessage mounted with index', this.index)
    // console.log('ChatMessage receivedTime', this.message.receivedTime)
  },
  /*
  mounted () {
    this.reactiveTimestampInterval = setInterval(() => {
      this.reactiveTimestamp = this.howLongAgo()
    }, 500)
  },
  unmounted () {
    clearInterval(this.reactiveTimestampInterval)
  },
  */
  computed: {
    items () {
      const sorted = {}
      for (let i = 0; i < this.message.items.length; i++) {
        const item = this.message.items[i]
        sorted[item.type] = item
      }
      return sorted
    },
    bubbleSize () {
      // TODO: Apply conditionals for window width
      const text = this.items.text?.text
      const image = this.items.image?.image
      const reply = this.items.reply?.payloadDigest
      if ((text && text.length >= 50) || image) {
        return '10'
      } else if (reply) {
        return '8'
      }
      return null
    },
    shortTimestamp () {
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
            sameElse: 'DD/MM/YYYY'
          })
        }
        case 'pending':
          return 'sending...'
        case 'error':
          return ''
      }
      return 'N/A'
    },
    stampAmount () {
      if (!this.message || !this.message.outpoints) {
        return '0 XPI'
      }
      const amount = stampPrice(this.message.outpoints)
      return Number(amount / 1000000).toFixed(2) + ' XPI'
    },
    bgColor () {
      return messageBackgroundColor(this.message.outbound, this.$q.dark.isActive)
    },
    textColor () {
      return this.$q.dark.isActive ? 'white' : 'black'
    }
  }
}
</script>
