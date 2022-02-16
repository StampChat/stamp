<template>
  <span v-html="markedMessage" />
</template>

<script>
import { renderMarkdown, purify } from '../../../utils/markdown'

export default {
  name: 'ChatMessageText',
  props: {
    text: {
      type: String,
      required: true,
    },
    isReply: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    markedMessage() {
      return this.isReply
        ? purify(this.text)
        : renderMarkdown(this.text, this.$q.dark.isActive)
    },
  },
}
</script>
