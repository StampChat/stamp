<template>
  <div class="row">
    <q-toolbar class="q-px-sm">
      <q-btn
        dense
        flat
        icon="unfold_more"
      >
        <q-menu>
          <q-list style="min-width: 100px">
            <q-item
              clickable
              v-close-popup
              @click="sendMoneyClicked"
            >
              <q-item-section avatar>
                <q-icon name="attach_money" />
              </q-item-section>
              <q-item-section>
                Attach Stealth Funds
              </q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="sendFileClicked"
            >
              <q-item-section avatar>
                <q-icon name="attach_file" />
              </q-item-section>
              <q-item-section>
                Attach File
              </q-item-section>
            </q-item>

            <q-item clickable>
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
            </q-item>
            <q-item>
              <q-item-section>
                <q-input
                  dense
                  outlined
                  style="width: 150px"
                  label="Stamp Price"
                  suffix="sats"
                  :value="stampAmount"
                  @input="stampAmountChanged"
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
        autofocus
        @keydown.enter.exact.prevent
        @keydown.enter.exact="sendMessage"
        v-model="innerMessage"
        :placeholder="$t('chatInput.placeHolder')"
      />
      <q-space />
      <div
        dense
        flat
        class="q-btn q-pa-sm"
        @mousedown.prevent="sendMessage"
      >
        <q-icon
          name="send"
        />
      </div>
    </q-toolbar>
  </div>
</template>

<script>
import emoji from 'node-emoji'
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast'
import data from '../../assets/emoticons/all.json'
import 'emoji-mart-vue-fast/css/emoji-mart.css'
import { defaultStampAmount } from '../../utils/constants'

const emojiIndex = new EmojiIndex(data)

export default {
  components: {
    Picker
  },
  model: {
    prop: 'message',
    event: 'input'
  },
  data () {
    return {
      emojiIndex
    }
  },
  props: {
    message: {
      type: String,
      default: () => ''
    },
    stampAmount: {
      type: Number,
      default: () => defaultStampAmount
    }
  },
  methods: {
    focus () {
      this.$refs.inputBox.focus()
    },
    mousedown (message) {
      console.log('mousedown: ' + message)
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
    },
    addEmoji (value) {
      // TODO: This needs to be cursor position aware
      this.innerMessage += `:${value.id}:`
    }
  },
  computed: {
    innerMessage: {
      get () {
        return this.message
      },
      set (val) {
        const replacer = (match) => emoji.emojify(match)
        // TODO: Remove emojify
        val = val.replace(/(:.*:)/g, replacer)
        this.$emit('input', val)
      }
    }
  }
}
</script>
