<template>
  <div>
    <q-drawer v-model="showTopicDrawer" side="right" :breakpoint="800">
      <topic-drawer :topic="topic" />
    </q-drawer>

    <q-header>
      <q-toolbar class="q-pl-sm">
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="toggleSettingsDrawerOpen"
          icon="menu"
        />
        <q-toolbar-title class="h6">{{ topic }}</q-toolbar-title>
        <q-space />
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="toggleTopicDrawer"
          icon="menu"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <router-view />
      </q-page>
    </q-page-container>

    <q-footer bordered v-show="$status.setup">
      <topic-input @send-message="sendMessage" v-model:message="message" />
    </q-footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { RouteLocationNormalized, useRouter } from 'vue-router'

import TopicInput from 'src/components/topic/TopicInput.vue'
import TopicDrawer from 'src/components/topic/TopicDrawer.vue'

import { useTopicStore } from 'src/stores/topics'
import { errorNotify } from 'src/utils/notifications'
import assert from 'assert'

export default defineComponent({
  data() {
    return {
      message: '',
    }
  },
  props: {},
  components: {
    TopicInput,
    TopicDrawer,
  },
  setup() {
    const router = useRouter()
    const topicsStore = useTopicStore()
    const routeParams = router.currentRoute.value.params
    const topic = routeParams['topic']
    const showTopicDrawer = ref(true)
    const toggleTopicDrawer = () => {
      showTopicDrawer.value = !showTopicDrawer.value
    }
    assert(typeof topic === 'string', 'Topic param should be string')
    return {
      topic: ref(topic),
      putMessage: topicsStore.putMessage,
      showTopicDrawer,
      toggleTopicDrawer,
    }
  },
  emits: ['toggleMyDrawerOpen'],
  beforeRouteUpdate(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: () => void,
  ) {
    console.log('moving')
    this.topic = to.params.topic as string
    next()
  },
  methods: {
    async sendMessage(message: string) {
      console.log(message)
      const entry = {
        kind: 'post' as const,
        message: this.message,
      }

      console.log('posting message', entry)
      if (!entry) {
        console.error('entry is null in CreatePost.vue post handler')
        return
      }

      try {
        await this.putMessage({
          wallet: this.$wallet,
          entry,
          topic: this.topic,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        errorNotify(err)
        return
      }

      this.message = ''
    },
    toggleSettingsDrawerOpen() {
      this.$emit('toggleMyDrawerOpen')
    },
  },
})
</script>
