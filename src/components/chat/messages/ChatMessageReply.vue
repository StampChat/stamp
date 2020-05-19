<template>
  <div class="reply" v-bind:key="index" v-if="item.type=='reply'">
    <div class='text-weight-bold' :style="nameColor"> {{ name }} </div>
    <chat-message
      class="row-auto"
      :items="getMessage(item.payloadDigest).items"
      :address="address"
    />
  </div>
</template>

<script>
import ChatMessage from './ChatMessage.vue'
import { mapGetters } from 'vuex'
import marked from 'marked'
import DOMPurify from 'dompurify'

export default {
  components: {
    ChatMessage
  },
  props: {
    name: {
      type: String,
      required: true
    },
    nameColor: {
      type: String,
      required: true
    },
    payloadDigest: {
      type: String,
      required: true
    }
  },
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload'
    }),
    getMessage (payloadDigest) {
      const message = this.getMessageByPayloadVuex()(payloadDigest)
      return message || { items: [] }
    },
    markedMessage (text) {
      return DOMPurify.sanitize(marked(text))
    }
  },
  filters: {
    marked: marked
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
