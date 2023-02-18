<template>
  <div class="row">
    <q-toolbar class="q-px-sm">
      <q-btn dense flat icon="unfold_more">
        <q-menu>
          <q-list style="min-width: 100px">
            <q-item clickable v-close-popup @click="giveLotusClicked">
              <q-item-section avatar side>
                <q-icon name="local_florist" />
              </q-item-section>
              <q-item-section>
                {{ $t('chatInput.giveLotusSecretly') }}
              </q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="sendFileClicked">
              <q-item-section avatar side>
                <q-icon name="attach_file" />
              </q-item-section>
              <q-item-section>
                {{ $t('chatInput.attachImage') }}
              </q-item-section>
            </q-item>

            <!-- <q-item clickable>
              <q-item-section avatar>
                <q-icon name="insert_emoticon" />
              </q-item-section>
              <q-item-section>
                Insert Emoji
              </q-item-section>
              <q-menu self="center middle">
                <picker
                  v-close-popup
                  :data="emojiIndex"
                  set="twitter"
                  @select="addEmoji"
                  :title="$t('chatInput.emojiPickerTitle')"
                  :show-skin-tones="false"
                />
              </q-menu>
            </q-item>-->
            <q-item>
              <q-item-section>
                <q-input
                  dense
                  outlined
                  style="width: 150px"
                  :label="$t('chatInput.stampPrice')"
                  suffix="XPI"
                  v-model="innerStampAmount"
                  input-class="text-right"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <!-- <q-separator vertical /> -->
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

<script lang="ts">
import { defineComponent } from 'vue'
import emoji from 'node-emoji'
import { defaultStampAmount } from '../../utils/constants'
import { processInput } from '../../utils/chat'

export default defineComponent({
  components: {
    // Picker
  },
  data() {
    return {}
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
    async dp(e: ClipboardEvent | DragEvent) {
      const items =
        'clipboardData' in e ? e.clipboardData?.items : e.dataTransfer?.items
      if (!items) {
        console.error('No items found in DP event handler', e)
        return
      }
      const blob = await processInput(items)
      return blob ? this.$emit('sendFileClicked', blob) : null
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
    giveLotusClicked() {
      this.$emit('giveLotusClicked')
    },
    sendFileClicked() {
      this.$emit('sendFileClicked')
    },
    addEmoji(value: { id: string }) {
      // TODO: This needs to be cursor position aware
      this.innerMessage += `:${value.id}:`
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
    innerStampAmount: {
      get() {
        return this.stampAmount
      },
      set(val: string) {
        this.$emit('update:stampAmount', Number(val))
      },
    },
  },
})
</script>
