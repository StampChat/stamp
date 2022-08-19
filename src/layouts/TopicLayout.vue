<template>
  <q-layout
    view="lhh LpR lff"
    container
    class="hide-scrollbar absolute full-width"
  >
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
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <router-view />
      </q-page>
    </q-page-container>

    <q-footer bordered>
      <topic-input @send-message="sendMessage" v-model:message="message" />
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'

import TopicInput from 'src/components/topic/TopicInput.vue'
import { useTopicStore } from 'src/stores/topics'
import { errorNotify } from 'src/utils/notifications'
import assert from 'assert'

export default defineComponent({
  data() {
    return {
      showForumDrawer: false,
      message: '',
    }
  },
  props: {},
  components: {
    TopicInput,
  },
  setup() {
    const router = useRouter()
    const topicsStore = useTopicStore()
    const routeParams = router.currentRoute.value.params
    const topic = routeParams['topic']
    assert(typeof topic === 'string', 'Topic param should be string')
    return {
      topic,
      putMessage: topicsStore.putMessage,
    }
  },
  emits: ['toggleMyDrawerOpen'],
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
          satoshis: 1_000,
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
