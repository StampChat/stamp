<template>
  <div>
    <q-drawer v-model="showForumDrawer" side="right" :breakpoint="800">
      <forum-drawer />
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
        <q-toolbar-title class="h6">Forum</q-toolbar-title>
        <q-space />
        <q-btn
          icon="refresh"
          flat
          class="q-mx-none q-pa-sm"
          @click="refreshContent"
        />
        <q-btn flat icon="post_add" class="q-mx-none q-pa-sm" to="/new-post" />
        <q-btn
          icon="settings"
          flat
          class="q-mx-none q-pa-sm"
          @click="showForumDrawer = !showForumDrawer"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <q-scroll-area
          ref="chatScroll"
          class="q-px-sm absolute full-width full-height"
        >
          <router-view @set-topic="setTopic" />
        </q-scroll-area>
      </q-page>
    </q-page-container>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'

import { useForumStore } from 'src/stores/forum'

import ForumDrawer from '../components/panels/ForumDrawer.vue'

export default defineComponent({
  data() {
    return {
      showForumDrawer: false,
    }
  },
  setup() {
    const forumStore = useForumStore()
    const { topics, selectedTopic } = storeToRefs(forumStore)

    return {
      refreshMessages: forumStore.refreshMessages,
      setSelectedTopic: forumStore.setSelectedTopic,
      topics,
      storeSelectedTopic: selectedTopic,
    }
  },
  components: { ForumDrawer },
  emits: ['toggleMyDrawerOpen'],
  mounted() {
    this.refreshContent()
  },
  methods: {
    toggleSettingsDrawerOpen() {
      this.$emit('toggleMyDrawerOpen')
    },
    refreshContent() {
      this.refreshMessages({ wallet: this.$wallet, topic: this.selectedTopic })
    },
    setTopic(text: string) {
      this.selectedTopic = text
      this.refreshContent()
    },
  },
  computed: {
    selectedTopic: {
      set(newVal?: string) {
        this.setSelectedTopic(newVal ?? '')
        // If the contents were cleared then we should refresh.
        if (!newVal) {
          this.refreshContent()
        }
      },
      get(): string {
        return this.storeSelectedTopic
      },
    },
  },
})
</script>
