<template>
  <q-scroll-area
    ref="chatScroll"
    @scroll="scrollHandler"
    class="q-px-none absolute full-width full-height column"
  >
    <template v-if="messages?.length > 0">
      <template v-for="message in messages" :key="message.payloadDigest">
        <topic-message :message="message" />
      </template>
    </template>
    <template v-else>
      <div>No messages loaded...</div>
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
import { defineComponent, computed, ref, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouteLocationNormalized, useRouter } from 'vue-router'
import assert from 'assert'
import { QScrollArea } from 'quasar'

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
    const topicParam = routeParams['topic']
    const { topics } = storeToRefs(topicStore)
    assert(typeof topicParam === 'string', "topic param isn't a string?")

    const topic = ref(topicParam)
    const bottom = ref(true)
    const messages = computed(() => {
      topicStore.ensureTopic(topic.value)
      const topicData = topics.value[topic.value]
      const threshold = topicData.threshold
      return topicData.messages.filter(message => message.satoshis >= threshold)
    })

    const chatScroll = ref<QScrollArea | null>(null)

    watch([messages], () => {
      const scrollArea = chatScroll.value
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      // If we're not at the bottom, and we're not at the top, leave the scroll
      // alone.
      if (!bottom.value && scrollTarget.scrollTop >= 10) {
        return
      }
      nextTick(() => {
        scrollArea.setScrollPosition(
          'vertical',
          scrollTarget.scrollHeight,
          scrollDuration,
        )
      })
    })

    return {
      refreshMessages: topicStore.refreshMessages,
      messages,
      topic: ref(topic),
      timeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
      bottom,
      chatScroll,
      buttonScrollBottom: () => {
        if (!chatScroll.value) {
          // Not mounted yet
          return
        }
        const scrollTarget = chatScroll.value.getScrollTarget()
        nextTick(() => {
          chatScroll.value?.setScrollPosition(
            'vertical',
            scrollTarget.scrollHeight,
            scrollDuration,
          )
        })
      },
      scrollBottom: () => {
        const scrollArea = chatScroll.value
        if (!scrollArea) {
          // Not mounted yet
          return
        }
        const scrollTarget = scrollArea.getScrollTarget()
        // If we're not at the bottom, and we're not at the top, leave the scroll
        // alone.
        if (!bottom.value && scrollTarget.scrollTop >= 10) {
          return
        }
        nextTick(() => {
          scrollArea.setScrollPosition(
            'vertical',
            scrollTarget.scrollHeight,
            scrollDuration,
          )
        })
      },
      scrollHandler: (details: {
        verticalSize: number
        verticalContainerSize: number
        verticalPosition: number
      }) => {
        if (
          // Ten pixels from top
          details.verticalPosition <= 10
        ) {
          return
        }
        // Set this afterwards, incase we were at the bottom already.
        // We want to ensure that we scroll!
        bottom.value =
          details.verticalSize -
            details.verticalPosition -
            details.verticalContainerSize <=
          10
      },
    }
  },
  beforeRouteUpdate(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: () => void,
  ) {
    this.topic = to.params.topic as string
    this.refreshContent()
    next()
  },
  mounted() {
    const timedRefresh = () => {
      this.refreshContent()
      this.timeoutId = setTimeout(timedRefresh, 1000)
    }
    timedRefresh()
    this.scrollBottom()
  },
  unmounted() {
    clearTimeout(this.timeoutId as ReturnType<typeof setTimeout>)
  },
  methods: {
    // FIXME: We need a `useWallet` function so we don't need to use the old object API
    refreshContent() {
      this.refreshMessages({ wallet: this.$wallet, topic: this.topic })
    },
  },
})
</script>
