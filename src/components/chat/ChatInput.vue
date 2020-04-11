<template>
  <div class="row">
    <q-resize-observer @resize="onResizeInput" />
    <q-toolbar class="bg-white q-pl-none">
      <q-btn dense flat color="primary" icon="attach_file" @click="sendFileClicked" />
      <q-input
        ref="inputBox"
        style="width: 100%;"
        dense
        borderless
        autogrow
        @keydown.enter.prevent="sendMessage"
        v-bind:value="message"
        v-on:input="onInput"
        placeholder="Write a message..."
      />
      <q-space />
        <q-btn  dense flat color="primary" icon="send" @click="sendMessage" />
    </q-toolbar>
  </div>
</template>

<script>
export default {
  components: {
  },
  data () {
    return { }
  },
  model: {
    prop: 'message',
    event: 'input'
  },
  props: {
    message: String
  },
  methods: {
    onInput (event) {
      this.$emit('input', event)
    },
    onResizeInput (size) {
      this.$emit('resize', size)
    },
    sendMessage () {
      if (this.message === '') {
        return
      }
      this.$emit('sendMessage', this.message)
    },
    sendFileClicked () {
      this.$emit('sendFileClicked')
    }
  },
  computed: {
  }
}
</script>
