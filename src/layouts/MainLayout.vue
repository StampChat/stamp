<template>
  <q-layout view="lHr lpr lFr">
    <q-drawer
      v-model="myDrawerOpen"
      :width="splitterRatio"
      :breakpoint="800"
      show-if-above
    >
      <left-drawer />
    </q-drawer>
    <router-view
      @toggleContactDrawerOpen="toggleContactDrawerOpen"
      @toggleMyDrawerOpen="toggleMyDrawerOpen"
      @setupCompleted="$emit('setupCompleted')"
    />
    <subscribe-dialog />
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import LeftDrawer from '../components/panels/LeftDrawer.vue'
import SubscribeDialog from '../components/SubscribeDialog.vue'

const compactWidth = 70
const compactCutoff = 325
const compactMidpoint = (compactCutoff + compactWidth) / 2

export default defineComponent({
  components: {
    LeftDrawer,
    SubscribeDialog,
  },
  setup() {
    return {}
  },
  emits: ['setupCompleted'],
  data() {
    return {
      trueSplitterRatio: compactCutoff,
      myDrawerOpen: true,
      contactDrawerOpen: false as boolean,
      compact: false,
      compactWidth,
    }
  },
  methods: {
    toggleContactDrawerOpen() {
      this.contactDrawerOpen = !this.contactDrawerOpen
    },
    toggleMyDrawerOpen() {
      if (this.compact) {
        this.compact = false
        this.trueSplitterRatio = compactCutoff
      }
      this.myDrawerOpen = !this.myDrawerOpen
    },
  },
  computed: {
    splitterRatio: {
      get(): number {
        return this.trueSplitterRatio
      },
      set(inputRatio: number): void {
        this.trueSplitterRatio = inputRatio
        this.$nextTick(() => {
          if (inputRatio < compactMidpoint) {
            this.trueSplitterRatio = compactWidth
            this.compact = true
          } else if (
            inputRatio > compactMidpoint &&
            inputRatio < compactCutoff
          ) {
            this.compact = false
            this.trueSplitterRatio = compactCutoff
          } else {
            this.compact = false
          }
        })
      },
    },
  },
})
</script>
