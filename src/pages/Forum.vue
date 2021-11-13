<template>
  <template
    v-for="(message) in messages"
    :key="message.payloadDigest"
  >
    <a-message
      v-show="showMessage(message.topic)"
      @set-topic="(...args) => $emit('set-topic', ...args)"
      :message="message"
      :show-parent="true"
      :show-replies="false"
    />
  </template>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import AMessage from '../components/forum/ForumMessage.vue'

export default defineComponent({
  props: {},
  components: {
    AMessage
  },
  data () {
    return { }
  },
  emits: ['set-topic'],
  methods: {
    showMessage (topic: string) {
      return topic.startsWith(this.selectedTopic)
    }
  },
  computed: {
    ...mapGetters({
      messages: 'forum/getMessages',
      topics: 'forum/getTopics',
      selectedTopic: 'forum/getSelectedTopic'
    })
  }
})
</script>
