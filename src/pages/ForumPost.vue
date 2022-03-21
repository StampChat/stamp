<template>
  <a-message
    v-bind="$attrs"
    :message="message"
    v-if="message && message.payloadDigest"
    :show-replies="true"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useForumStore, MessageWithReplies } from 'src/stores/forum'

import AMessage from '../components/forum/ForumMessage.vue'

export default defineComponent({
  setup() {
    const forumStore = useForumStore()

    return {
      getMessage: forumStore.getMessage,
      fetchMessage: forumStore.fetchMessage,
    }
  },
  components: {
    AMessage,
  },
  props: {},
  data() {
    const payloadDigest = this.$route.params.payloadDigest as string
    return {
      payloadDigest,
      message: {} as Partial<MessageWithReplies>,
    }
  },
  async mounted() {
    this.payloadDigest = this.$route.params.payloadDigest as string
    const message = await this.fetchMessage({
      wallet: this.$wallet,
      payloadDigest: this.payloadDigest,
    })
    if (message) {
      this.message = message
    }
  },
  async beforeRouteUpdate(to, from, next) {
    this.payloadDigest = to.params.payloadDigest as string
    const message = await this.fetchMessage({
      wallet: this.$wallet,
      payloadDigest: this.payloadDigest,
    })
    if (message) {
      this.message = message
    }
    console.log('returned msg', this.message)
    next()
  },
})
</script>
