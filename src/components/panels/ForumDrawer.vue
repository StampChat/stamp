<template>
  <div class="column full-height">
    <q-scroll-area
      class="col"
    >
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
        <q-item>
          <q-checkbox
            v-model="compactView"
            class="q-mx-sm q-pa-sm"
            label="Compact View"
          />
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapMutations } from 'vuex'

import { sortModes } from '../../utils/sorting'

const DURATIONS = [{ label: '1 Day', value: 1000 * 60 * 60 * 24 * 1 }, { label: '1 Week', value: 1000 * 60 * 60 * 24 * 7 }]

export default defineComponent({
  components: {
  },
  data () {
    return {
      contactBookOpen: false,
      sortModes: sortModes,
      durations: DURATIONS
    }
  },
  methods: {
    ...mapActions({
      refreshMessages: 'forum/refreshMessages'
    }),
    ...mapMutations({
      setSelectedTopic: 'forum/setSelectedTopic',
      setSortMode: 'forum/setSortMode',
      setDuration: 'forum/setDuration',
      setVoteThreshold: 'forum/setVoteThreshold',
      setCompactView: 'forum/setCompactView'
    }),
    refreshContent () {
      this.refreshMessages({ wallet: this.$wallet, topic: this.selectedTopic })
    },
    setTopic (text: string) {
      this.selectedTopic = text
      this.refreshContent()
    }
  },
  computed: {
    ...mapGetters({
      topics: 'forum/getTopics',
      getSelectedTopic: 'forum/getSelectedTopic',
      getSortMode: 'forum/getSortMode',
      getDuration: 'forum/getDuration',
      getVoteThreshold: 'forum/getVoteThreshold',
      getCompactView: 'forum/getCompactView'

    }),
    sortMode: {
      set (newVal?: string) {
        this.setSortMode(newVal ?? 'hot')
      },
      get (): string {
        return this.getSortMode
      }
    },
    selectedTopic: {
      set (newVal?: string) {
        this.setSelectedTopic(newVal ?? '')
      },
      get (): string {
        return this.getSelectedTopic
      }
    },
    duration: {
      set (newVal?: {label: string, value: number}) {
        console.log(newVal)
        this.setDuration(newVal?.value ?? '')
        this.refreshContent()
      },
      get (): {label: string, value: number} | undefined {
        return DURATIONS.find((duration) => duration.value === this.getDuration)
      }
    },
    compactView: {
      set (newVal?: boolean) {
        this.setCompactView(newVal)
      },
      get (): boolean {
        return this.getCompactView
      }
    },
    threshold: {
      set (newVal?: string) {
        const threshold = Number.parseFloat(newVal ?? '0')
        const newThreshold = Number.isNaN(threshold) ? 0 : threshold
        this.setVoteThreshold(newThreshold)
      },
      get (): string {
        return this.getVoteThreshold
      }
    }
  }
})
</script>
