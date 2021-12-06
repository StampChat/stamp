<template>
  <span v-html="markedMessage(text)" />
</template>

<script>
import { toMarkdown } from '../../../utils/markdown'

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
      return toMarkdown(text)
    },
  },
}
</script>
