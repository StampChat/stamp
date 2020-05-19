<template>
  <q-item class='q-pa-none' dense clickable>
    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog title="Stamp Transaction" :outpoints="message.outpoints" />
    </q-dialog>

    <!-- Delete Dialog -->
    <q-dialog v-model="deleteDialog">
      <delete-message-dialog :address="address" :payloadDigest="message.payloadDigest" :index="index" />
    </q-dialog>

    <!-- Information tooltip -->
    <q-tooltip>
      <div class="col-auto q-pa-none">
        <div class="row-auto">{{ stampPrice }}</div>
        <div class="row-auto">{{ timestampString }}</div>
      </div>
    </q-tooltip>

    <chat-message-menu
      :address="address"
      :message="message"
      @txClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, payloadDigest: message.payloadDigest })"
    />

    <div class='col'>
      <div class = 'q-px-sm' v-for="(item, index) in message.items" :key="index" >
        <chat-message-reply v-if="item.type=='reply'" :payloadDigest="item.payloadDigest" :address="address"/>
        <chat-message-text v-else-if="item.type=='text'" :text="item.text" />
        <chat-message-image v-else-if="item.type=='image'" :image="item.image" />
        <chat-message-stealth v-else-if="item.type=='stealth'" :amount="item.amount" />
      </div>
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
      deleteDialog: false
    }
  },
  props: {
    nameColor: String,
    address: String,
    message: Object,
    payloadDigest: String,
    index: Number
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
      return 'unknown'
    },
    timestampString () {
      const timestamp = this.message.timestamp || this.message.serverTime
      return moment(timestamp)
    },
    stampPrice () {
      const amount = stampPrice(this.message.outpoints)
      return amount + ' sats'
    }
  }
}
</script>
