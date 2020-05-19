<template>
  <div class="q-pa-none q-ma-none q-ml-sm  q-mr-sm col rounded-borders bg-dark-3">
    <!-- <chat-message-menu
      :address="address"
      :id="index"
      :message="message"
      @txClick="transactionDialog = true"
      @deleteClick="deleteDialog = true"
      @replyClick="replyClicked({ address, index })"
    /> -->

    <div class="row">
      <div class="col">
        <div class="col" style="border-bottom: 1px solid grey;" v-if="showHeader">
          <span class='text-weight-bold' :style="nameColor"> {{contact.name}} </span>
          <span class='float-right'>
            {{shortTimestamp}}
          </span>
                  <!-- <div class="row-auto">{{stampPrice}}</div> -->
        </div>
        <q-list>
          <chat-message
            v-for="(message, index) in messages"
            :key="index"
            :message="message"
            :items="message.items"
            :address="address"
            :nameColor="nameColor"
            :name="contact.name"
          />
        </q-list>
      </div>
      <!-- <div v-if="message.status==='error'" class="row justify-end q-pt-xs" style="full-width">
        <div class="col-auto">
          <q-icon name="error" color="red" />
        </div>
      </div> -->
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import ChatMessage from './ChatMessage.vue'
// import ChatMessageMenu from '../../context_menus/ChatMessageMenu.vue'
// import DeleteMessageDialog from '../../dialogs/DeleteMessageDialog'
// import TransactionDialog from '../../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../../wallet/helpers'

export default {
  components: {
    ChatMessage
    // ChatMessageMenu
    // TransactionDialog,
    // DeleteMessageDialog
  },
  data () {
    return {
      transactionDialog: false,
      deleteDialog: false
    }
  },
  props: {
    nameColor: String,
    contact: Object,
    address: String,
    messages: Array,
    showHeader: {
      type: Boolean,
      default: () => true
    }
  },
  methods: {
    replyClicked (args) {
      this.$emit('replyClicked', args)
    }
  },
  computed: {
    lastMessage () {
      const nMessages = this.messages.length
      const lastMessage = this.messages[nMessages - 1]
      return lastMessage
    },
    shortTimestamp () {
      const nMessages = this.messages.length
      const lastMessage = this.messages[nMessages - 1]
      console.log(lastMessage)
      switch (lastMessage.status) {
        case 'confirmed': {
          const timestamp = lastMessage.timestamp || lastMessage.serverTime
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
      const timestamp = this.lastMessage.timestamp || this.lastMessage.serverTime
      return moment(timestamp)
    },
    stampPrice () {
      // TODO: Sum
      const amount = stampPrice(this.lastMessage.outpoints)
      return amount + ' sats'
    }
  }
}
</script>
