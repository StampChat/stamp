<template>
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import emoji from 'node-emoji'

import { processInput } from '../../utils/chat'

export default defineComponent({
  data() {
    return {}
  },
  setup() {
    return {}
  },
  props: {
    message: {
      type: String,
      default: () => '',
    },
  },
  emits: ['update:message', 'sendMessage'],
  methods: {
    // ChatInput drop/paste handler
    async dp(e: ClipboardEvent | DragEvent) {
      const items =
        'clipboardData' in e ? e.clipboardData?.items : e.dataTransfer?.items
      if (!items) {
        console.error('No items found in DP event handler', e)
        return
      }
      const blob = await processInput(items)
      console.log(blob)
    },
    focusInput(e: FocusEvent) {
      if (e.type === 'blur') {
        const relatedTarget = e.relatedTarget as Element
        // Prevent the focus if the target isn't related
        if (!relatedTarget || relatedTarget.localName === 'input') {
          return
          // allow focus change to other inputs (e.g. RightPanel)
        }
      }
      const inputBox = this.$refs.inputBox as HTMLElement
      inputBox.focus()
    },
    sendMessage() {
      this.$emit('sendMessage', this.innerMessage)
    },
  },
  computed: {
    innerMessage: {
      get() {
        return this.message
      },
      set(val: string) {
        const replacer = (match: string) => emoji.emojify(match)
        // TODO: Remove emojify
        const emojifiedValue = val.replace(/(:.*:)/g, replacer)
        this.$emit('update:message', emojifiedValue)
      },
    },
  },
})
</script>
