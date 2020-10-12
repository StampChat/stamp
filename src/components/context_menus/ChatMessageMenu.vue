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
        @click="$emit('reply-clicked')"
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
        @click="$emit('tx-clicked')"
      >
        <q-item-section> Stamp Transaction </q-item-section>
      </q-item>
      <q-item
        :v-if="index && payloadDigest"
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
        @click="$emit('delete-clicked')"
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
  props: {
    address: {
      type: String,
      required: true
    },
    message: {
      type: Object,
      required: true
    },
    payloadDigest: {
      type: String,
      required: true
    },
    index: {
      type: Number,
      required: false,
      default: () => 0
    }
  },
  methods: {
    ...mapMutations({
      deleteMessage: 'chats/deleteMessage'
    }),
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount'
    }),
    sendMessage (...args) {
      return this.$relayClient.sendMessage(args)
    },
    sendStealthPayment (...args) {
      return this.$relayClient.sendStealthPayment(args)
    },
    sendImage (...args) {
      return this.$relayClient.sendImage(args)
    },
    resend () {
      this.deleteMessage({ address: this.address, payloadDigest: this.payloadDigest, index: this.index })
      const stampAmount = this.getStampAmount()(this.address)
      return this.$relayClient.sendMessageImpl({ address: this.address, items: this.message.items, stampAmount })
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
