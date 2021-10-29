<template>
  <template
    v-for="(message) in messages"
    :key="message.payloadDigest"
  >
    <a-message :message="message" />
  </template>
</template>

<script lang="ts">
import { defineComponent, defineAsyncComponent } from 'vue'

export default defineComponent({
  props: {
    messages: {
      default: undefined,
      type: Object
    }
  },
  components: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AMessage: defineAsyncComponent(async () => import('./AgoraMessage.vue') as any)
  }
})
</script>
