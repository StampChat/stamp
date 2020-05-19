<template>
  <div class='q-ml-sm'>
    <div
      class="row-auto text-left"
      v-html = "markedMessage(text)"
    />
  </div>
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
  data () {
    return {
      imageDialog: false,
      image: null
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
