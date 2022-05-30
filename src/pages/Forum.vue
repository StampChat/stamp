<template>
  <template v-if="messages.length > 0">
    <template v-for="message in sortedPosts" :key="message.payloadDigest">
      <a-message
        v-show="showMessage(message.topic)"
        @set-topic="(...args) => $emit('set-topic', ...args)"
        :message="message"
        :show-parent="true"
        :show-replies="false"
        :compact-view="compactView"
      />
    </template>
  </template>
  <template v-else>
    <div>
      <q-spinner-puff class="absolute-center" color="purple" size="20rem" />
    </div>
  </template>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'

import { useForumStore } from 'src/stores/forum'
import { sortPostsByMode } from '../utils/sorting'

import AMessage from '../components/forum/ForumMessage.vue'

export default defineComponent({
  props: {},
  components: {
    AMessage,
  },
  data() {
    return {}
  },
  setup() {
    const forumStore = useForumStore()
    const {
      getMessages,
      getSortMode,
      getTopics,
      getSelectedTopic,
      getVoteThreshold,
      getCompactView,
    } = storeToRefs(forumStore)
    return {
      messages: getMessages,
      sortMode: getSortMode,
      topics: getTopics,
      selectedTopic: getSelectedTopic,
      voteThreshold: getVoteThreshold,
      compactView: getCompactView,
    }
  },
  emits: ['set-topic'],
  methods: {
    showMessage(topic: string) {
      return topic.startsWith(this.selectedTopic)
    },
  },
  computed: {
    sortedPosts() {
      return sortPostsByMode(this.messages, this.sortMode).filter(
        msg => msg.satoshis >= this.voteThreshold * 1_000_000,
      )
    },
  },
})
</script>
