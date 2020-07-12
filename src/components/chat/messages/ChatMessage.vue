<template>
  <q-item
    class="q-pa-none"
    dense
    @mouseover="mouseover = true"
    @mouseleave="mouseover = false"
  >
    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog title="Backing Transactions" :outpoints="message.outpoints" />
    </q-dialog>

    <!-- Delete Dialog -->
    <q-dialog v-model="deleteDialog">
      <delete-message-dialog :address="address" :payloadDigest="message.payloadDigest" :index="index" />
    </q-dialog>

    <chat-message-menu
      v-if="message.payloadDigest"
      :address="address"
      :message="message"
      :payloadDigest="message.payloadDigest"
      :index="index"
      @txClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, payloadDigest: message.payloadDigest })"
    />

    <div class='col' v-if="message.payloadDigest">
      <div  class='q-px-lg' v-for="(item, index) in message.items" :key="index" >
        <chat-message-reply v-if="item.type=='reply'" :payloadDigest="item.payloadDigest" :address="address" :mouseover="mouseover"/>
        <chat-message-text v-else-if="item.type=='text'" :text="item.text" />
        <chat-message-image v-else-if="item.type=='image'" :image="item.image" />
        <chat-message-stealth v-else-if="item.type=='stealth'" :amount="item.amount" />
      </div>
    </div>
    <div class='col' v-else-if="!message.payloadDigest">
      unable to find message payload
    </div>

    <q-tooltip>
      {{ stampAmount }}
    </q-tooltip>
    <div class='q-px-sm col-auto'>
      {{ shortTime }}
    </div>

    <div v-if="message.status==='error'" class="col-auto">
      <q-icon name="error" color="red" />
    </div>
  </q-item>
</template>

<script>
import moment from 'moment'
import ChatMessageMenu from '../../context_menus/ChatMessageMenu.vue'
import ChatMessageReply from './ChatMessageReply.vue'
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import DeleteMessageDialog from '../../dialogs/DeleteMessageDialog'
import TransactionDialog from '../../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../../wallet/helpers'

export default {
  name: 'chat-message',
  components: {
    ChatMessageMenu,
    ChatMessageReply,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    TransactionDialog,
    DeleteMessageDialog
  },
  data () {
    return {
      transactionDialog: false,
      deleteDialog: false,
      mouseover: false
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
    nameColor: {
      type: String,
      required: true
    },
    // Payload digest and index are not passed when nested in a reply
    payloadDigest: {
      type: String,
      required: false
    },
    index: {
      type: Number,
      required: false
    }
  },
  methods: {
    replyClicked (args) {
      this.$emit('replyClicked', args)
    }
  },
  computed: {
    shortTimestamp () {
      switch (this.message.status) {
        case 'confirmed': {
          const timestamp = this.message.timestamp || this.message.serverTime
          const howLongAgo = moment(timestamp)
          return howLongAgo.calendar(null, {
            sameDay: 'HH:mm:ss',
            nextDay: '[Tomorrow] HH:mm:ss',
            nextWeek: 'dddd',
            lastDay: 'HH:mm:ss',
            lastWeek: '[Last] dddd',
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
    shortTime () {
      switch (this.message.status) {
        case 'confirmed': {
          const timestamp = this.message.timestamp || this.message.serverTime
          const howLongAgo = moment(timestamp)
          return howLongAgo.format('HH:mm:ss')
        }
        case 'pending':
          return 'sending...'
        case 'error':
          return ''
      }
      return 'N/A'
    },
    timestampString () {
      const timestamp = this.message.timestamp || this.message.serverTime
      return moment(timestamp)
    },
    stampAmount () {
      if (!this.message || !this.message.outpoints) {
        return '0 sats'
      }
      const amount = stampPrice(this.message.outpoints)
      return amount + ' sats'
    }
  }
}
</script>
