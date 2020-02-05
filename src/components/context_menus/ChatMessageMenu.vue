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
        v-if='message.retryData !== undefined'
        clickable
        v-close-popup
        @click="resend"
      >
        <q-item-section>Resend</q-item-section>
      </q-item>
      <q-separator />
      <q-item
        clickable
        v-close-popup
      >
        <q-item-section>Copy </q-item-section>
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

export default {
  props: ['address', 'id', 'message'],
  methods: {
    ...mapActions({ deleteMessage: 'chats/deleteMessage' })
  }
}
</script>
