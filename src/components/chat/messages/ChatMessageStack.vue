<template>
  <div class="row q-px-lg" style="max-width: 720px">
    <template v-for="(message, index) in messages" :key="index">
      <chat-message
        :message="message"
        :index="index + globalIndex"
        :items="message.items"
        :address="address"
        :name-color="nameColor"
        :name="contact.name"
        @replyClicked="replyClicked"
      />
    </template>
  </div>
</template>

<script>
import ChatMessage from './ChatMessage.vue'

export default {
  components: {
    ChatMessage,
  },
  props: {
    contact: {
      type: Object,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    messages: {
      type: Array,
      required: true,
    },
    nameColor: {
      type: String,
      required: true,
    },
    globalIndex: {
      type: Number,
      required: true,
    },
  },
  emits: ['replyClicked'],
  methods: {
    replyClicked(args) {
      this.$emit('replyClicked', args)
    },
  },
  mounted() {
    console.log('ChatMessageStack mounted with globalIndex ', this.globalIndex)
  },
}
</script>

<style lang="scss">
.stack-header {
  border-bottom: 1px;
  border-bottom-style: solid;
  border-bottom-color: $separator-color;
}
</style>
