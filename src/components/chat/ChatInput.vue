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
        v-model="innerMessage"
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
import emoji from 'node-emoji'

export default {
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
  },
  computed: {
    innerMessage: {
      get () {
        return this.message
      },
      set (val) {
        const replacer = (match) => emoji.emojify(match)
        val = val.replace(/(:.*:)/g, replacer)
        this.$emit('input', val)
      }
    }
  }
}
</script>
