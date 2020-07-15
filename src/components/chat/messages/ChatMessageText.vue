<template>
  <span v-html="markedMessage(text)" />
</template>

<script>
import marked from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'chat-message-section',
  props: {
    text: {
      type: String,
      required: true
    }
  },
  methods: {
    markedMessage (text) {
      const html = DOMPurify.sanitize(marked(text))
      return html
    }
  },
  filters: {
    marked: marked
  }
}
</script>
