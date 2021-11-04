<template>
  <q-card class="q-ma-sm">
    <a-message
      v-bind="$attrs"
      :message="message"
      v-if="message && message.payloadDigest"
      :show-replies="true"
    />
  </q-card>
</template>

<script lang="ts">
import { SoapboxMessage } from 'src/cashweb/types/soapbox'
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

import AMessage from '../components/soapbox/SoapboxMessage.vue'

export default defineComponent({
  components: {
    AMessage
  },
  props: {},
  data () {
    const payloadDigest = this.$route.params.payloadDigest as string
    return {
      payloadDigest,
      message: {} as Partial<SoapboxMessage>
    }
  },
  async mounted () {
    this.payloadDigest = this.$route.params.payloadDigest as string
    this.message = await this.$store.dispatch('soapbox/fetchMessage', { wallet: this.$wallet, payloadDigest: this.payloadDigest }) as SoapboxMessage
  },
  async beforeRouteUpdate (to, from, next) {
    this.payloadDigest = to.params.payloadDigest as string
    this.message = await this.$store.dispatch('soapbox/fetchMessage', { wallet: this.$wallet, payloadDigest: this.payloadDigest }) as SoapboxMessage
    console.log('returned msg', this.message)
    next()
  },
  computed: {
    ...mapGetters({
      getMessage: 'soapbox/getMessage'
    })
  },
  methods: {
    ...mapActions({
      fetchMessage: 'soapbox/fetchMessage'
    })
  }
})
</script>
