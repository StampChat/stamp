<template>
  <q-menu
    touch-position
    context-menu
  >
    <q-list
      dense
      style="min-width: 100px"
    >
      <q-item
        v-if="message.outpoints != null"
        clickable
        v-close-popup
        @click="$emit('replyClick')"
      >
        <q-item-section> Reply </q-item-section>
      </q-item>
      <q-item
        v-if="message.outpoints != null"
        clickable
        v-close-popup
      >
        <q-item-section> Forward </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        v-if="message.outpoints != null"
        clickable
        v-close-popup
        @click="$emit('txClick')"
      >
        <q-item-section> Stamp Transaction </q-item-section>
      </q-item>
      <q-item
        v-if='message.retryData !== undefined'
        clickable
        v-close-popup
        @click="resend"
      >
        <q-item-section> Resend </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="copyMessage"
      >
        <q-item-section> Copy </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('deleteClick')"
      >
        <q-item-section>Delete</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script>
import { mapMutations, mapGetters } from 'vuex'
import { copyToClipboard } from 'quasar'

export default {
  props: ['address', 'payloadDigest', 'index', 'message'],
  methods: {
    ...mapMutations({
      deleteMessage: 'chats/deleteMessage'
    }),
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount'
    }),
    sendMessage (...args) {
      this.$relayClient.sendMessage(args)
    },
    sendStealthPayment (...args) {
      this.$relayClient.sendStealthPayment(args)
    },
    sendImage (...args) {
      this.$relayClient.sendImage(args)
    },
    resend () {
      const stampAmount = this.getStampAmount()(this.address)
      this.$relayClient.sendMessageImpl({ addr: this.address, items: this.message.items, stampAmount })
    },
    copyMessage () {
      const text = this.message.items.find(el => el.type === 'text').text
      copyToClipboard(text).then(() => {
        this.$q.notify({
          message: '<div class="text-center"> Message copied to clipboard </div>',
          html: true,
          color: 'purple'
        })
      })
        .catch(() => {
          // fail
        })
    }
  }
}
</script>
