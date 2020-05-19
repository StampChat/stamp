<template>
  <div class="row">
    <div class="col q-px-sm">
      <div class="stack-header row">
        <div class='col text-weight-bold' :style="nameColor"> {{ contact.name }} </div>
         <div class="flex-break"></div>
        <div class='col-auto'>
          {{ stampAmount }}
        </div>
        <div class='q-px-sm col-auto'>
          {{ shortTimestamp }}
        </div>
      </div>
      <q-list>
        <chat-message
          v-for="(message, index) in messages"
          :key="index"
          :message="message"
          :index="index + globalIndex"
          :items="message.items"
          :address="address"
          :nameColor="nameColor"
          :name="contact.name"
        />
      </q-list>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import ChatMessage from './ChatMessage.vue'
import { stampPrice } from '../../../wallet/helpers'

export default {
  components: {
    ChatMessage
  },
  props: {
    nameColor: String,
    contact: Object,
    address: String,
    messages: Array,
    globalIndex: Number
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
  border-bottom-color: gray;
}
</style>
