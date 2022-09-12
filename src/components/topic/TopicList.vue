<template>
  <div class="full-width column col">
    <q-scroll-area class="q-px-none col">
      <q-list>
        <q-separator />
        <q-item>
          <q-item-section>
            <q-item-label>Topics</q-item-label>
          </q-item-section>
          <q-space />
          <q-btn
            dense
            flat
            icon="add"
            @click="() => openPage($router, '/add-topic')"
          />
        </q-item>
        <q-separator />
        <template v-for="topic in topics" :key="topic">
          <topic-list-link :topic="topic" icon="forum" />
        </template>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'

import TopicListLink from './TopicListLink.vue'
import { useTopicStore } from 'src/stores/topics'

import { openPage } from '../../utils/routes'

export default defineComponent({
  setup() {
    const { getTopics } = storeToRefs(useTopicStore())

    return {
      topics: getTopics,
      openPage,
    }
  },
  components: {
    TopicListLink,
  },
})
</script>

<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
  color: #f0409b;
}
</style>
