<template>
  <div class="row">
    <div class="col">
      <div class="stack-header row">
        <div class="q-px-md col text-weight-bold">
          {{ name }}
        </div>
      </div>
      <div class="q-py-sm q-px-lg">
        <div>
          <chat-message-text :text="text" />
        </div>
        <div>
          <q-img
            src="~assets/donation_qr_code.jpg"
            width="10vw"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import { stampPrice } from '../../../wallet/helpers'
import ChatMessageText from './ChatMessageText.vue'

export default {
  components: {
    ChatMessageText
  },
  props: {
    name: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
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
      return 'N/A'
    },
    timestampString () {
      const timestamp = this.lastMessage.timestamp || this.lastMessage.serverTime
      return moment(timestamp)
    },
    stampAmount () {
      // TODO: Don't sum again inside the chat message?
      const amount = this.messages.reduce((total, msg) => total + stampPrice(msg.outpoints), 0)
      return amount + ' sats'
    }
  }
}
</script>

<style lang="scss">
.stack-header {
  border-bottom: 1px;
  border-bottom-style: solid;
  border-bottom-color: $separator-color;
}
</style>
