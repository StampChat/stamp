<template>
  <q-chat-message
    class='q-py-sm'
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
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ChatMessageSection from './ChatMessageSection.vue'
import formatting from '../../utils/formatting'

export default {
  components: {
    ChatMessageSection
  },
  methods: {
    ...mapGetters(['getUnixTime']),
    ...mapActions(['updateClock'])
  },
  computed: {
    timeStamp () {
      switch (this.message.status) {
        case 'confirmed':
          let unixTime = this.getUnixTime()
          let stamp = formatting.unixToStamp(this.timestamp, unixTime)
          return stamp
        case 'pending':
          return 'sending...'
        case 'error':
          return 'error'
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
    }
  },
  created () {
    this.updateClock()
  },
  props: ['timestamp', 'message', 'contact']
}
</script>
