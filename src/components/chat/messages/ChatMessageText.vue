<template>
  <span v-html="markedMessage(text)" />
</template>

<script>
import { renderMarkdown } from '../../../utils/markdown'

export default {
  name: 'ChatMessageSection',
  props: {
    text: {
      type: String,
      required: true,
    },
  },
  methods: {
    markedMessage(text) {
      return renderMarkdown(text, this.$q.dark.isActive)
    },
  },
}
</script>
