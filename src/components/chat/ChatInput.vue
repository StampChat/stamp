<template>
  <div class="row">
    <q-toolbar class="q-pl-none">
      <q-btn
        dense
        flat
        icon="attach_money"
        @click="sendMoneyClicked"
        :color="`${$q.dark.isActive ? 'light' : 'dark'}`"
      />
      <q-btn
        dense
        flat
        icon="attach_file"
        @click="sendFileClicked"
        :color="`${$q.dark.isActive ? 'light' : 'dark'}`"
      />
      <q-input
        ref="inputBox"
        class="full-width"
        dense
        borderless
        autogrow
        @keydown.enter.exact.prevent
        @keydown.enter.exact="sendMessage"
        v-bind:value="message"
        v-on:input="onInput"
        placeholder="Write a message..."
      />
      <q-space />
      <q-btn
        dense
        flat
        icon="send"
        @click="sendMessage"
        :color="`${$q.dark.isActive ? 'light' : 'dark'}`"
      />
      <q-input dense outlined style="width: 125px" label="Stamp" suffix="sats" v-bind:value="stampAmount" @input="stampAmountChanged" input-class="text-right" />
    </q-toolbar>
  </div>
</template>

<script>
export default {
  components: {},
  data () {
    return {}
  },
  model: {
    prop: 'message',
    event: 'input'
  },
  props: {
    message: String,
    stampAmount: Number
  },
  methods: {
    focus () {
      this.$refs.inputBox.focus()
    },
    onInput (event) {
      this.$emit('input', event)
    },
    sendMessage () {
      if (this.message === '') {
        return
      }
      this.$emit('sendMessage', this.message)
    },
    sendMoneyClicked () {
      this.$emit('sendMoneyClicked')
    },
    sendFileClicked () {
      this.$emit('sendFileClicked')
    },
    stampAmountChanged (value) {
      this.$emit('stampAmountChanged', value)
    }
  }
}
</script>
