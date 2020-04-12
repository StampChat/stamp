<template>
  <q-chat-message
    class='q-py-sm'
    :name="stampPrice"
    :avatar="contact.avatar"
    :sent="message.outbound"
    :stamp="formatedTimestamp"
  >
    <!-- Context Menu -->
    <chat-message-menu
      :address="address"
      :id="index"
      :message="message"
      @txClick="transactionDialog = true"
      @replyClick="replyClicked({ address, index })"
    />

    <!-- Transaction Dialog -->
    <q-dialog v-model="transactionDialog">
      <!-- Switch to outpoints -->
      <transaction-dialog
        title="Stamp Transaction"
        :outpoints="message.outpoints"
      />
    </q-dialog>

    <chat-message-section
      v-for="(item, index) in message.items"
      :key="index"
      :item="item"
      :end='message.items.length === index + 1'
      :single='message.items.length === 1'
      :address="address"
    />

    <div
      v-if="message.status==='error'"
      class='row justify-end q-pt-xs'
      style="full-width"
    >
      <div class='col-auto'>
        <q-icon
          name='error'
          color="red"
        />
      </div>
    </div>
  </q-chat-message>
</template>

<script>
import moment from 'moment'
import ChatMessageSection from './ChatMessageSection.vue'
import ChatMessageMenu from '../context_menus/ChatMessageMenu.vue'
import TransactionDialog from '../dialogs/TransactionDialog.vue'
import { stampPrice } from '../../utils/wallet'

export default {
  components: {
    ChatMessageSection,
    ChatMessageMenu,
    TransactionDialog
  },
  data () {
    return {
      transactionDialog: false
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
        case 'confirmed':
          const timestamp = this.message.timestamp || this.message.receivedTime
          const howLongAgo = moment(timestamp)
          return moment(this.now).to(howLongAgo)
        case 'pending':
          return 'sending...'
        case 'error':
          return ''
      }
      return 'unknown'
    },
    isText () {
      return this.message.type === 'text'
    },
    isImage () {
      return this.message.type === 'image'
    },
    text () {
      if (this.message.type === 'text') {
        return this.message.body
      } else if (this.message.type === 'stealth') {
        return this.message.body.memo
      } else if (this.message.type === 'image') {
        return this.message.body.caption
      } else {
        return 'Unknown'
      }
    },
    stampPrice () {
      let amount = stampPrice(this.message.outpoints)
      if (amount) {
        return amount + ' sats'
      } else {
        // We return newline so that the message doesn't move when switching
        return '&nbsp'
      }
    }
  },
  created () {
  }
}
</script>
