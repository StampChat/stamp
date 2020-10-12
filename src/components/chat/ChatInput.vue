<template>
  <div class="row">
    <q-toolbar class="q-px-sm">
      <q-btn
        dense
        flat
        icon="attach_money"
        @click="sendMoneyClicked"
      />
      <q-btn
        dense
        flat
        icon="attach_file"
        @click="sendFileClicked"
      />
      <q-btn
        dense
        flat
        icon="insert_emoticon"
        @click="menuPicker=true"
      >
        <q-menu>
          <picker
            :data="emojiIndex"
            set="twitter"
            @select="addEmoji"
            :title="$t('chatInput.emojiPickerTitle')"
            :show-skin-tones="false"
          />
        </q-menu>
      </q-btn>

      <!-- <q-separator vertical /> -->
      <q-input
        ref="inputBox"
        class="full-width q-pl-md"
        dense
        borderless
        autogrow
        @keydown.enter.exact.prevent
        @keydown.enter.exact="sendMessage"
        v-model="innerMessage"
        :placeholder="$t('chatInput.placeHolder')"
      />
      <q-space />
      <q-btn
        dense
        flat
        icon="send"
        @click="sendMessage"
      />
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
    </q-toolbar>
  </div>
</template>

<script>
import emoji from 'node-emoji'
import { Picker, EmojiIndex } from 'emoji-mart-vue-fast'
import data from '../../assets/emoticons/all.json'
import 'emoji-mart-vue-fast/css/emoji-mart.css'
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
      default: () => 5000
    }
  },
  methods: {
    focus () {
      this.$refs.inputBox.focus()
    },
    sendMessage () {
      if (this.message === '') {
        return
      }
      this.$emit('send-message', this.message)
    },
    sendMoneyClicked () {
      this.$emit('send-money-clicked')
    },
    sendFileClicked () {
      this.$emit('send-file-clicked')
    },
    stampAmountChanged (value) {
      this.$emit('stamp-amount-changed', value)
    },
    addEmoji (value) {
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
