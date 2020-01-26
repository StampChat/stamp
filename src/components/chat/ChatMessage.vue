<template>
  <div class='q-py-sm'>
    <q-chat-message
      :avatar="contact.avatar"
      :sent="message.outbound"
      :stamp="timeStamp"
    >
      <chat-message-section
        v-for="(item, index) in message.items"
        :key="index"
        :item="item"
        :end='message.items.length === index + 1'
        :single='message.items.length === 1'
      />
    </q-chat-message>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ChatMessageSection from './ChatMessageSection.vue'

export default {
  components: {
    ChatMessageSection
  },
  methods: {
    ...mapGetters(['getUnixTime']),
    ...mapActions(['updateClock']),
    unixToStamp (unixTime, dateNow) {
      let nowTs = Math.floor(dateNow / 1000)
      let seconds = nowTs - unixTime

      if (seconds > 2 * 24 * 3600) {
        return 'a few days ago'
      }
      if (seconds > 24 * 3600) {
        return 'yesterday'
      }
      if (seconds > 3600) {
        return 'a few hours ago'
      }
      if (seconds > 1800) {
        return 'half an hour ago'
      }
      if (seconds > 120) {
        return Math.floor(seconds / 60) + ' minutes ago'
      }
      if (seconds > 60) {
        return '1 minute ago'
      }
      return 'just now'
    }
  },
  computed: {
    timeStamp () {
      if (!this.message.sent) {
        return 'sending...'
      }
      let unixTime = this.getUnixTime()
      let stamp = this.unixToStamp(this.message.timestamp, unixTime)
      return stamp
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
    }
  },
  created () {
    this.updateClock()
  },
  props: ['message', 'contact']
}
</script>
