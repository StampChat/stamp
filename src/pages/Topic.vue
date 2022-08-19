<template>
  <q-scroll-area
    ref="chatScroll"
    @scroll="scrollHandler"
    class="q-px-none absolute full-width full-height column"
  >
    <template v-if="messages?.length > 0">
      <template v-for="message in messages" :key="message.payloadDigest">
        <TopicMessage :message="message" />
      </template>
    </template>
    <template v-else>
      <div>
        <q-spinner-puff class="absolute-center" color="purple" size="20rem" />
      </div>
    </template>
  </q-scroll-area>
  <q-page-sticky position="bottom-right" :offset="[18, 18]" v-show="!bottom">
    <q-btn
      round
      size="md"
      icon="arrow_downward"
      @mousedown.prevent="buttonScrollBottom"
      color="accent"
    />
  </q-page-sticky>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import assert from 'assert'
import { debounce, QScrollArea } from 'quasar'

import { useTopicStore } from 'src/stores/topics'

import TopicMessage from 'src/components/topic/TopicMessage.vue'

const scrollDuration = 0

export default defineComponent({
  props: {},
  components: {
    TopicMessage,
  },
  setup() {
    const topicStore = useTopicStore()
    const router = useRouter()
    const routeParams = router.currentRoute.value.params
    const topic = routeParams['topic']
    const { topics } = storeToRefs(topicStore)
    assert(typeof topic === 'string', "topic param isn't a string?")

    const messages = computed(() => {
      topicStore.ensureTopic(topic)

      return topics.value[topic].messages
    })

    return {
      refreshMessages: topicStore.refreshMessages,
      messages,
      topic,
      timeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
      chatScroll: ref<QScrollArea | null>(null),
      bottom: true as boolean,
    }
  },
  mounted() {
    const timedRefresh = () => {
      this.refreshContent()
      this.timeoutId = setTimeout(timedRefresh, 1000)
    }
    timedRefresh()
    this.scrollBottom()
    // set the chat width
    this.resizeHandler()
    // Adjust the chat width when window resizes
    window.addEventListener('resize', debounce(this.resizeHandler, 50))
  },
  unmounted() {
    clearTimeout(this.timeoutId as ReturnType<typeof setTimeout>)
  },
  methods: {
    refreshContent() {
      this.refreshMessages({ wallet: this.$wallet, topic: this.topic })
    },
    // Used by sticky QButton to scroll to bottom
    buttonScrollBottom() {
      const scrollArea = this.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      this.$nextTick(() => {
        scrollArea.setScrollPosition(
          'vertical',
          scrollTarget.scrollHeight,
          scrollDuration,
        )
      })
    },
    scrollBottom() {
      const scrollArea = this.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      // If we're not at the bottom, and we're not at the top, leave the scroll
      // alone.
      if (!this.bottom && scrollTarget.scrollTop >= 10) {
        return
      }
      this.$nextTick(() => {
        scrollArea.setScrollPosition(
          'vertical',
          scrollTarget.scrollHeight,
          scrollDuration,
        )
      })
    },
    resizeHandler() {
      const chatScroll = this.chatScroll
      if (!chatScroll || !chatScroll.$el) {
        return
      }
    },
    scrollHandler(details: {
      verticalSize: number
      verticalContainerSize: number
      verticalPosition: number
    }) {
      if (
        // Ten pixels from top
        details.verticalPosition <= 10
      ) {
        return
      }
      // Set this afterwards, incase we were at the bottom already.
      // We want to ensure that we scroll!
      this.bottom =
        details.verticalSize -
          details.verticalPosition -
          details.verticalContainerSize <=
        10
      console.log('bottom?', this.bottom)
    },
  },
})
</script>
