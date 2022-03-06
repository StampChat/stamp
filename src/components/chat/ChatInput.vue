<template>
  <div class="row">
    <q-toolbar class="q-px-sm">
      <q-btn
        dense
        flat
        icon="attach_file"
        class="q-btn"
        @mousedown.prevent="sendFileClicked"
      />
      <q-btn
        dense
        flat
        icon="local_florist"
        class="q-btn"
        @mousedown.prevent="giveLotusClicked"
      />
      <q-input
        ref="inputBox"
        class="full-width q-pl-md"
        dense
        borderless
        autogrow
        @paste="dp($event)"
        @drop.prevent="dp($event)"
        @blur.capture="focusInput($event)"
        @keydown.enter.exact.prevent
        @keydown.enter.exact="sendMessage"
        @mousedown.self.stop
        v-model="innerMessage"
        :placeholder="$t('chatInput.placeHolder')"
      />
      <q-space />
      <q-btn
        dense
        flat
        icon="send"
        class="q-btn"
        @mousedown.prevent="sendMessage"
      />
    </q-toolbar>
  </div>
</template>

<script>
import emoji from 'node-emoji'
import { defaultStampAmount } from '../../utils/constants'
import { processInput } from '../../utils/chat'
// import { Picker, EmojiIndex } from 'emoji-mart-vue-fast'
// import data from '../../assets/emoticons/all.json'
// import 'emoji-mart-vue-fast/css/emoji-mart.css'

// const emojiIndex = new EmojiIndex(data)

export default {
  components: {
    // Picker
  },
  data() {
    return {
      // emojiIndex
    }
  },
  props: {
    message: {
      type: String,
      default: () => '',
    },
    stampAmount: {
      type: Number,
      default: () => defaultStampAmount,
    },
  },
  emits: [
    'update:message',
    'update:stampAmount',
    'sendMessage',
    'giveLotusClicked',
    'sendFileClicked',
  ],
  methods: {
    // ChatInput drop/paste handler
    async dp(e) {
      const items = e.clipboardData?.items || e.dataTransfer?.items
      const blob = await processInput(items)
      return blob ? this.$emit('sendFileClicked', blob) : null
    },
    focusInput(e) {
      const relatedTarget = e.relatedTarget
      if (e.type === 'blur') {
        // Prevent the focus if the target isn't related
        if (!relatedTarget) {
          return
          // allow focus change to other inputs (e.g. RightPanel)
        } else if (relatedTarget.localName === 'input') {
          return
        }
      }
      this.$refs.inputBox.focus()
    },
    sendMessage() {
      this.$emit('sendMessage', this.innerMessage)
    },
    giveLotusClicked() {
      this.$emit('giveLotusClicked')
    },
    sendFileClicked() {
      this.$emit('sendFileClicked')
    },
    addEmoji(value) {
      // TODO: This needs to be cursor position aware
      this.innerMessage += `:${value.id}:`
    },
  },
  computed: {
    innerMessage: {
      get() {
        return this.message
      },
      set(val) {
        const replacer = match => emoji.emojify(match)
        // TODO: Remove emojify
        const emojifiedValue = val.replace(/(:.*:)/g, replacer)
        this.$emit('update:message', emojifiedValue)
      },
    },
    innerStampAmount: {
      get() {
        return Number(this.stampAmount / 1000000).toFixed(2)
      },
      set(val) {
        this.$emit('update:stampAmount', Number(val) * 1000000)
      },
    },
  },
}
</script>
