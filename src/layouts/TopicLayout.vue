<template>
  <div>
    <q-drawer
      v-model="showTopicDrawer"
      side="right"
      :breakpoint="800"
      show-if-above
    >
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
          icon="settings"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <router-view @set-selected-message="setReplyMessage" />
      </q-page>
    </q-page-container>

    <q-footer bordered v-show="$status.setup">
      <div v-if="!!replyMessage" class="q-px-md q-pt-sm" ref="replyBox">
        <!-- Reply box -->
        <div class="row q-px-sm q-pt-sm">
          <div class="col-12">
            <topic-reply-message
              :message="replyMessage"
              :topic="topic"
              @close-reply="setReplyMessage(null)"
            />
          </div>
        </div>
      </div>
      <topic-input @send-message="sendMessage" v-model:message="message" />
    </q-footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { RouteLocationNormalized, useRouter } from 'vue-router'

import TopicInput from 'src/components/topic/TopicInput.vue'
import TopicDrawer from 'src/components/topic/TopicDrawer.vue'
import TopicReplyMessage from 'src/components/topic/TopicReplyMessage.vue'

import { MessageWithReplies, useTopicStore } from 'src/stores/topics'
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
    TopicReplyMessage,
    TopicInput,
    TopicDrawer,
  },
  setup() {
    const router = useRouter()
    const topicsStore = useTopicStore()
    const routeParams = router.currentRoute.value.params
    const topic = routeParams['topic']
    const showTopicDrawer = ref(false)
    const toggleTopicDrawer = () => {
      showTopicDrawer.value = !showTopicDrawer.value
    }

    const replyMessage = ref<MessageWithReplies | null>(null)
    const setReplyMessage = (newReply: MessageWithReplies | null) => {
      console.log('setting reply', newReply)
      replyMessage.value = newReply
    }

    assert(typeof topic === 'string', 'Topic param should be string')
    return {
      replyMessage,
      setReplyMessage,
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
      if (!message) {
        // Don't send blank messages
        return
      }

      if (this.replyMessage) {
        console.log('Reply!', this.replyMessage)
      }

      const entry = {
        kind: 'post' as const,
        message: message,
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
          parentDigest: this.replyMessage?.payloadDigest ?? undefined,
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
