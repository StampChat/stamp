<template>
  <div class="column full-height">
    <q-scroll-area class="col">
      <q-list>
        <q-item>
          <q-input
            filled
            class="q-mx-sm q-pa-none"
            v-model="selectedTopic"
            label="Topic"
            style="width: 250px"
            @keyup.enter.prevent="refreshContent"
            clearable
          />
        </q-item>

        <q-item>
          <q-select
            class="q-mx-sm q-pa-none"
            v-model="sortMode"
            :options="sortModes"
            label="Sort"
            style="width: 250px"
            use-input
          />
        </q-item>

        <q-item>
          <q-select
            class="q-mx-sm q-pa-none"
            v-model="duration"
            :options="durations"
            label="Duration"
            style="width: 250px"
            use-input
          />
        </q-item>

        <q-item>
          <q-input
            class="q-mx-sm q-pa-none"
            v-model="threshold"
            label="Vote Threshold"
            style="width: 250px"
            use-input
          />
        </q-item>

        <q-item>
          <q-btn
            color="primary"
            class="q-mx-sm q-pa-sm"
            label="Create Post"
            to="/new-post"
          />
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { useForumStore } from 'src/stores/forum'
import { storeToRefs } from 'pinia'
import { defineComponent } from 'vue'

import { sortModes, SortMode } from '../../utils/sorting'

const DURATIONS = [
  { label: '1 Day', value: 1000 * 60 * 60 * 24 * 1 },
  { label: '1 Week', value: 1000 * 60 * 60 * 24 * 7 },
  { label: '1 Month', value: 1000 * 60 * 60 * 24 * 31 },
]

export default defineComponent({
  setup() {
    const forum = useForumStore()
    const { topics, selectedTopic, sortMode, duration, voteThreshold } =
      storeToRefs(forum)
    return {
      topics,
      storeSelectedTopic: selectedTopic,
      storeSortMode: sortMode,
      storeDuration: duration,
      storeVoteThreshold: voteThreshold,
      refreshMessages: forum.refreshMessages,
      setSelectedTopic: forum.setSelectedTopic,
      setSortMode: forum.setSortMode,
      setDuration: forum.setDuration,
      setVoteThreshold: forum.setVoteThreshold,
    }
  },
  components: {},
  data() {
    return {
      contactBookOpen: false,
      sortModes: sortModes,
      durations: DURATIONS,
    }
  },
  methods: {
    refreshContent() {
      this.refreshMessages({ wallet: this.$wallet, topic: this.selectedTopic })
    },
    setTopic(text: string) {
      this.selectedTopic = text
      this.refreshContent()
    },
  },
  computed: {
    sortMode: {
      set(newVal?: string) {
        if (!newVal || !sortModes.includes(newVal as SortMode)) {
          return
        }
        this.setSortMode(newVal as SortMode)
      },
      get(): string {
        return this.storeSortMode
      },
    },
    selectedTopic: {
      set(newVal?: string) {
        this.setSelectedTopic(newVal ?? '')
      },
      get(): string {
        return this.storeSelectedTopic
      },
    },
    duration: {
      set(newVal?: { label: string; value: number }) {
        this.setDuration(newVal?.value ?? 0)
        this.refreshContent()
      },
      get(): { label: string; value: number } | undefined {
        return DURATIONS.find(duration => duration.value === this.storeDuration)
      },
    },
    threshold: {
      set(newVal?: string) {
        const threshold = Number.parseFloat(newVal ?? '0')
        const newThreshold = Number.isNaN(threshold) ? 0 : threshold
        this.setVoteThreshold(newThreshold)
      },
      get(): string {
        return this.storeVoteThreshold.toString()
      },
    },
  },
})
</script>
