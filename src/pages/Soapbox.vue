<template>
  <template
    v-for="(message) in messages"
    :key="message.payloadDigest"
  >
    <a-message
      v-show="showMessage(message.topic)"
      v-bind="$attrs"
      :message="message"
      :show-parent="true"
      :show-replies="false"
    />
  </template>
</template>

<script lang="ts">
import { SoapboxMessage } from '../cashweb/types/soapbox'
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import AMessage from '../components/soapbox/SoapboxMessage.vue'

export default defineComponent({
  props: {},
  components: {
    AMessage
  },
  data () {
    return { }
  },
  emits: [],
  methods: {
    showMessage (topic: string) {
      return topic.startsWith(this.selectedTopic)
    }
  },
  computed: {
    ...mapGetters({
      getMessages: 'soapbox/getMessages',
      topics: 'soapbox/getTopics',
      selectedTopic: 'soapbox/getSelectedTopic'
    }),
    messages () {
      return this.getMessages.filter((message: SoapboxMessage) =>
        message.entries.some((entry) => entry.kind === 'post')
      )
    }
  }
})
</script>
