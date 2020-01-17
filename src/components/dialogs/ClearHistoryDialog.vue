<template>
  <q-card>
    <q-card-section class="row items-center">
      <q-avatar
        icon="clear_all"
        color="red"
        text-color="white"
      />
      <span class="q-ml-sm">Are you sure you want to clear all chat history with {{ name }}?</span>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        label="Clear"
        color="primary"
        v-close-popup
        @click="clearChat(address)"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  props: ['address', 'name'],
  methods: {
    ...mapActions({
      clearChat: 'chats/clearChat'
    })
  }
}
</script>
