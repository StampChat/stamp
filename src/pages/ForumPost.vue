<template>
  <a-message
    v-bind="$attrs"
    :message="message"
    v-if="message && message.payloadDigest"
    :show-replies="true"
  />
</template>

<script lang="ts">
import { ForumMessage } from 'src/cashweb/types/forum'
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

import AMessage from '../components/forum/ForumMessage.vue'

export default defineComponent({
  components: {
    AMessage
  },
  props: {},
  data () {
    const payloadDigest = this.$route.params.payloadDigest as string
    return {
      payloadDigest,
      message: {} as Partial<ForumMessage>
    }
  },
  async mounted () {
    this.payloadDigest = this.$route.params.payloadDigest as string
    this.message = await this.$store.dispatch('forum/fetchMessage', { wallet: this.$wallet, payloadDigest: this.payloadDigest }) as ForumMessage
  },
  async beforeRouteUpdate (to, from, next) {
    this.payloadDigest = to.params.payloadDigest as string
    this.message = await this.$store.dispatch('forum/fetchMessage', { wallet: this.$wallet, payloadDigest: this.payloadDigest }) as ForumMessage
    console.log('returned msg', this.message)
    next()
  },
  computed: {
    ...mapGetters({
      getMessage: 'forum/getMessage'
    })
  },
  methods: {
    ...mapActions({
      fetchMessage: 'forum/fetchMessage'
    })
  }
})
</script>
