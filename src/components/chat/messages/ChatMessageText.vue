<template>
  <span v-html="markedMessage" />
</template>

<script>
import { renderMarkdown } from '../../../utils/markdown'

export default {
  name: 'ChatMessageText',
  props: {
    text: {
      type: String,
      required: true
    }
  },
  computed: {
    markedMessage () {
      return renderMarkdown(this.text)
    }
  }
}
</script>
