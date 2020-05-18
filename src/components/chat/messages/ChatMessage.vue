<template>
  <div class="q-pa-none q-ma-none q-ml-sm  q-mr-sm col rounded-borders bg-dark-3">
    <!-- Context Menu -->

    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog title="Stamp Transaction" :outpoints="message.outpoints" />
    </q-dialog>

    <!-- Delete Dialog -->
    <q-dialog v-model="deleteDialog">
      <delete-message-dialog :address="address" :index="message.payloadDigest" />
    </q-dialog>

    <chat-message-menu
      :address="address"
      :message="message"
      @txClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, index: message.payloadDigest })"
    />

    <div v-for="(item, index) in message.items" :key="index" >
      {{ item }}
    </div>

    <q-tooltip>
      <div class="col-auto q-pa-none">
        <div class="row-auto">{{stampPrice}}</div>
        <div class="row-auto">{{timestampString}}</div>
      </div>
    </q-tooltip>
    <div class="col-auto">
      <q-icon name="error" color="red" />
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import ChatMessageMenu from '../context_menus/ChatMessageMenu.vue'
import DeleteMessageDialog from '../dialogs/DeleteMessageDialog'
import TransactionDialog from '../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../wallet/helpers'

export default {
  components: {
    ChatMessageMenu,
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
    contact: Object
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
