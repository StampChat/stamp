<template>
  <template
    v-for="(message) in messages"
    :key="message.payloadDigest"
  >
    <a-message
      v-bind="$attrs"
      :message="message"
      :show-parent="true"
      :show-replies="false"
    />
  </template>
</template>

<script lang="ts">
import marked from 'marked'
import DOMPurify from 'dompurify'

import { AgoraMessage } from '../cashweb/types/agora'
import { defineComponent } from 'vue'
import { mapGetters, mapActions } from 'vuex'
import AMessage from '../components/agora/AgoraMessage.vue'

export default defineComponent({
  props: {},
  components: {
    AMessage
  },
  data () {
    return { }
  },
  emits: ['toggleMyDrawerOpen'],
  methods: {
    ...mapActions({
      refreshMessages: 'agora/refreshMessages'
    }),
    toggleSettingsDrawerOpen () {
      this.$emit('toggleMyDrawerOpen')
    },
    formatSatoshis (value: number) {
      return (value / 1_000_000).toFixed(2)
    },
    markedMessage (text: string) {
      const html = DOMPurify.sanitize(marked(text))
      return html
    },
    formatAddress (address:string) {
      return address.substring(6, 12) + '...' + address.substring(address.length - 6, address.length)
    },
    replyToMessage (payloadDigest: string) {
      console.log(payloadDigest)
    }
  },
  computed: {
    ...mapGetters({
      getMessages: 'agora/getMessages',
      topics: 'agora/getTopics'
    }),
    messages () {
      return this.getMessages.filter((message: AgoraMessage) =>
        message.entries.some((entry) => entry.kind === 'post')
      )
    }
  }
})
</script>
