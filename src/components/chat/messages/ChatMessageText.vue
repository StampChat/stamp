<template>
  <span v-html="markedMessage(text)" />
</template>

<script>
import { marked, renderer } from '../../../utils/markdown'
import DOMPurify from 'dompurify'

export default {
  name: 'ChatMessageSection',
  props: {
    text: {
      type: String,
      required: true
    }
  },
  methods: {
    markedMessage (text) {
      const html = DOMPurify.sanitize(marked(text, { renderer: renderer }), { ADD_ATTR: ['target'] })
      return html
    }
  },
  filters: {
    marked: marked
  }
}
</script>
