<template>
  <template v-if="sortedPosts?.length > 0">
    <template v-for="message in sortedPosts" :key="message.payloadDigest">
      <forum-post
        v-show="showMessage(message.topic)"
        @set-topic="(...args) => $emit('set-topic', ...args)"
        :message="message"
        :show-parent="true"
        :show-replies="false"
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
import { defineComponent, computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useForumStore } from 'src/stores/forum'
import { sortPostsByMode } from '../utils/sorting'

import ForumPost from '../components/forum/ForumPost.vue'

export default defineComponent({
  props: {},
  components: {
    ForumPost,
  },
  emits: ['set-topic'],
  setup() {
    const forumStore = useForumStore()
    const {
      messages,
      sortMode,
      topics,
      selectedTopic,
      voteThreshold,
      duration,
    } = storeToRefs(forumStore)
    const sortedPosts = computed(() => {
      if (!messages) {
        return
      }
      const from = Date.now() - duration.value
      const filteredMessages = messages.value.filter(message => {
        // FIXME: Something is converting the timestamp to a string.
        return new Date(message.timestamp).valueOf() >= from
      })
      console.log(filteredMessages)
      return sortPostsByMode(filteredMessages, sortMode.value).filter(
        msg => msg.satoshis >= voteThreshold.value * 1_000_000,
      )
    })
    const showMessage = (topic: string) => {
      return topic.startsWith(selectedTopic.value)
    }

    return {
      duration,
      sortedPosts,
      sortMode,
      topics,
      selectedTopic,
      voteThreshold,
      showMessage,
    }
  },
})
</script>
