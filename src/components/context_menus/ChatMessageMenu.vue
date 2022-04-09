<template>
  <q-menu touch-position context-menu>
    <q-list dense style="min-width: 100px">
      <q-item
        v-if="message.outpoints != null"
        clickable
        v-close-popup
        @click="$emit('replyClick')"
      >
        <q-item-section>Reply</q-item-section>
      </q-item>
      <q-item v-if="message.outpoints != null" clickable v-close-popup>
        <q-item-section>Forward</q-item-section>
      </q-item>
      <q-separator />
      <q-item
        v-if="message.outpoints != null"
        clickable
        v-close-popup
        @click="$emit('txClick')"
      >
        <q-item-section>Stamp Transaction</q-item-section>
      </q-item>
      <q-item
        :v-if="index && payloadDigest"
        clickable
        v-close-popup
        @click="resend"
      >
        <q-item-section>Resend</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="copyMessage">
        <q-item-section>Copy</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('deleteClick')">
        <q-item-section>Delete</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

import { copyToClipboard } from 'quasar'
import { useChatStore } from 'src/stores/chats'
import { Message } from 'src/cashweb/types/messages'

export default defineComponent({
  props: {
    address: {
      type: String,
      required: true,
    },
    message: {
      type: Object as PropType<Message>,
      required: true,
    },
    payloadDigest: {
      type: String,
      required: true,
    },
    index: {
      type: Number,
      required: false,
      default: () => 0,
    },
  },
  setup() {
    const chatStore = useChatStore()
    return {
      deleteMessage: chatStore.deleteMessage,
      getStampAmount: chatStore.getStampAmount,
    }
  },
  emits: ['deleteClick', 'replyClick', 'txClick'],
  methods: {
    sendMessage(args: {
      address: string
      text: string
      replyDigest?: string | undefined
      stampAmount: number
    }) {
      return this.$relayClient.sendMessage(args)
    },
    sendStealthPayment(args: {
      address: string
      stampAmount: number
      amount: number
      memo: string
    }) {
      return this.$relayClient.sendStealthPayment(args)
    },
    sendImage(args: {
      address: string
      image: string
      caption: string
      replyDigest: string
      stampAmount: number
    }) {
      return this.$relayClient.sendImage(args)
    },
    resend() {
      this.deleteMessage({
        address: this.address,
        payloadDigest: this.payloadDigest,
      })
      const stampAmount = this.getStampAmount(this.address)
      return this.$relayClient.sendMessageImpl({
        address: this.address,
        items: this.message.items,
        stampAmount,
      })
    },
    copyMessage() {
      const textItem = this.message.items.find(el => el.type === 'text')
      const text = textItem && 'text' in textItem ? textItem.text : ''
      copyToClipboard(text)
        .then(() => {
          this.$q.notify({
            message:
              '<div class="text-center"> Message copied to clipboard </div>',
            html: true,
            color: 'purple',
          })
        })
        .catch(() => {
          // fail
        })
    },
  },
})
</script>
