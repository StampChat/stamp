<template>
  <template v-for="message in messages" :key="message.payloadDigest">
    <a-message v-bind="$attrs" :message="message" />
  </template>
</template>

<script lang="ts">
import { defineComponent, defineAsyncComponent } from 'vue'

export default defineComponent({
  props: {
    messages: {
      default: undefined,
      type: Object,
    },
  },
  components: {
    AMessage: defineAsyncComponent(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async () => import('./ForumMessage.vue') as any,
    ),
  },
})
</script>
