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
import { ForumMessage } from '../cashweb/types/forum'
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
  emits: [],
  methods: {
    showMessage (topic: string) {
      return topic.startsWith(this.selectedTopic)
    }
  },
  computed: {
    ...mapGetters({
      getMessages: 'forum/getMessages',
      topics: 'forum/getTopics',
      selectedTopic: 'forum/getSelectedTopic'
    }),
    messages () {
      return this.getMessages.filter((message: ForumMessage) =>
        message.entries.some((entry) => entry.kind === 'post')
      )
    }
  }
})
</script>
