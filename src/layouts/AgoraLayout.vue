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
        <q-toolbar-title class="h6">
          Agora
        </q-toolbar-title>
        <q-space />
        <q-btn
          icon="refresh"
          flat
          @click="refreshContent"
        />
        <q-input
          filled
          class="q-mx-sm q-pa-none"
          v-model="selectedTopic"
          label="Topic"
          style="width: 250px"
          @keyup.enter.prevent="refreshContent"
          clearable
        />
        <q-btn
          flat
          class="q-mx-sm q-pa-sm"
          label="Create Post"
          to="/create-post"
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
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapGetters, mapActions, mapMutations } from 'vuex'

export default defineComponent({
  data () {
    return { }
  },
  emits: ['toggleMyDrawerOpen'],
  mounted () {
    this.refreshContent()
  },
  methods: {
    ...mapActions({
      refreshMessages: 'agora/refreshMessages'
    }),
    ...mapMutations({
      setSelectedTopic: 'agora/setSelectedTopic'
    }),
    toggleSettingsDrawerOpen () {
      this.$emit('toggleMyDrawerOpen')
    },
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
      topics: 'agora/getTopics',
      getSelectedTopic: 'agora/getSelectedTopic'
    }),
    selectedTopic: {
      set (newVal?: string) {
        this.setSelectedTopic(newVal ?? '')
        // If the contents were cleared then we should refresh.
        if (!newVal) {
          this.refreshContent()
        }
      },
      get (): string {
        return this.getSelectedTopic
      }
    }
  }
})
</script>
