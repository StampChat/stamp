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
        v-if="message.stampTx != null"
        clickable
        v-close-popup
        @click="$emit('dialogClick')"
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
        @click="deleteMessage({ addr: address, id })"
      >
        <q-item-section>Delete</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script>
import { mapActions } from 'vuex'
import { copyToClipboard } from 'quasar'

export default {
  props: ['address', 'id', 'message'],
  methods: {
    ...mapActions({
      deleteMessage: 'chats/deleteMessage',
      sendMessage: 'chats/sendMessage',
      sendStealthPayment: 'chats/sendStealthPayment',
      sendImage: 'chats/sendImage'
    }),
    resend () {
      this.deleteMessage({ addr: this.address, id: this.id })
      let retryData = this.message.retryData
      switch (retryData.msgType) {
        case 'text':
          this.sendMessage({ addr: this.address, text: retryData.text })
          break
        case 'stealth':
          this.sendStealthPayment({ addr: this.address, amount: retryData.amount, memo: retryData.memo })
          break
        case 'image':
          this.sendImage({ addr: this.address, image: retryData.image, caption: retryData.caption })
          break
      }
    },
    copyMessage () {
      let text = this.message.items.find(el => el.type === 'text').text
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
