<template>
  <q-card class="q-ma-sm">
    <a-message
      :message="message"
      v-if="message && message.payloadDigest"
      :show-replies="true"
    />
  </q-card>
</template>

<script lang="ts">
import { AgoraMessage } from 'src/cashweb/types/agora'
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

import AMessage from '../components/agora/AgoraMessage.vue'

export default defineComponent({
  components: {
    AMessage
  },
  props: {},
  data () {
    const payloadDigest = this.$route.params.payloadDigest as string
    return {
      payloadDigest,
      message: {} as Partial<AgoraMessage>
    }
  },
  async mounted () {
    this.payloadDigest = this.$route.params.payloadDigest as string
    this.message = await this.$store.dispatch('agora/fetchMessage', { wallet: this.$wallet, payloadDigest: this.payloadDigest }) as AgoraMessage
  },
  async beforeRouteUpdate (to, from, next) {
    this.payloadDigest = to.params.payloadDigest as string
    this.message = await this.$store.dispatch('agora/fetchMessage', { wallet: this.$wallet, payloadDigest: this.payloadDigest }) as AgoraMessage
    console.log('returned msg', this.message)
    next()
  },
  computed: {
    ...mapGetters({
      getMessage: 'agora/getMessage'
    })
  },
  methods: {
    ...mapActions({
      fetchMessage: 'agora/fetchMessage'
    })
  }
})
</script>
