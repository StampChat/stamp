<template>
  <div
    class="row-auto text-left"
    v-html = "markedMessage(text)"
  />
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
      return DOMPurify.sanitize(marked(text))
    }
  },
  filters: {
    marked: marked
  }
}
</script>
