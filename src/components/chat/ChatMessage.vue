<template>
  <div class="q-pa-none q-ma-sm col rounded-borders bg-dark-3">
    <!-- Context Menu -->

    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog title="Stamp Transaction" :outpoints="message.outpoints" />
    </q-dialog>

    <!-- Delete Dialog -->
    <q-dialog v-model="deleteDialog">
      <delete-message-dialog :address="address" :index="index" />
    </q-dialog>

    <chat-message-menu
      :address="address"
      :id="index"
      :message="message"
      @txClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, index })"
    />

    <div class="row">
      <div class="col-auto q-pa-sm" style="min-width: 100px">
        <div class="row-auto">{{stampPrice}}</div>
        <div class="row-auto">{{formatedTimestamp}}</div>
      </div>
      <div class="col">
        <!-- TODO: Assign random color based on seed from name -->
        <div class="col text-weight-bold" style="border-bottom: 1px solid grey;">{{contact.name}}</div>
        <chat-message-section :key="index" :items="message.items" :address="address" />
      </div>

      <div v-if="message.status==='error'" class="row justify-end q-pt-xs" style="full-width">
        <div class="col-auto">
          <q-icon name="error" color="red" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import ChatMessageSection from './ChatMessageSection.vue'
import ChatMessageMenu from '../context_menus/ChatMessageMenu.vue'
import DeleteMessageDialog from '../dialogs/DeleteMessageDialog'
import TransactionDialog from '../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../wallet/helpers'

export default {
  components: {
    ChatMessageSection,
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
    address: String,
    message: Object,
    contact: Object,
    index: String,
    now: Object
  },
  methods: {
    replyClicked (args) {
      this.$emit('replyClicked', args)
    }
  },
  computed: {
    formatedTimestamp () {
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
    stampPrice () {
      const amount = stampPrice(this.message.outpoints)
      return amount + ' sats'
    }
  },
  created () {}
}
</script>
