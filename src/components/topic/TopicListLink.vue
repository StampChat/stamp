<template>
  <!-- TODO: We need a better way to handle multiple pages and types of chats. -->
  <q-item :active="isActive" active-class="active-chat-list-item">
    <q-item-section avatar clickable @click="setRoute()">
      <q-avatar rounded>
        <img src="~assets/stamp-icon.png" v-if="!icon" />
        <q-icon :name="icon" v-if="icon" />
      </q-avatar>
    </q-item-section>
    <q-item-section clickable @click="setRoute()">
      <q-item-label>{{ topic }}</q-item-label>
    </q-item-section>
    <q-space />
    <q-btn dense flat icon="delete_forever" @click="deleteTopic" />
  </q-item>
</template>

<script lang="ts">
import { useRouter } from 'vue-router'

import { useTopicStore } from 'src/stores/topics'
import { computed, defineComponent, nextTick } from 'vue'

export default defineComponent({
  props: {
    topic: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: false,
      default: () => null,
    },
  },
  setup(props) {
    const topicStore = useTopicStore()
    const router = useRouter()
    const route = computed(() => `/topic/${props.topic}`)

    const deleteTopic = (e: Event) => {
      router.back()
      nextTick(() => topicStore.deleteTopic(props.topic))
      e.preventDefault()
    }

    const setRoute = () => {
      router.push(route.value).catch(() => {
        // Don't care. Probably duplicate route
      })
    }

    const isActive = computed(() => {
      return router.currentRoute.value.path === route.value
    })

    return {
      deleteTopic,
      route,
      setRoute,
      isActive,
    }
  },
})
</script>
<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
}
</style>
