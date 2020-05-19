<template>
  <div class="reply">
    <chat-message
      class="row-auto"
      :message="message"
      :address="address"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'chat-message-reply',
  components: {
    ChatMessage: () => import('./ChatMessage.vue')
  },
  props: {
    address: String,
    payloadDigest: {
      type: String,
      required: true
    }
  },
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload'
    })
  },
  computed: {
    message () {
      const message = this.getMessageByPayloadVuex()(this.payloadDigest)
      return message || { items: [] }
    }
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  background: #FFF;
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}
</style>
