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
          <template
            v-for="(message) in messages"
            :key="message.payloadDigest"
          >
            <a-message
              :message="message"
              @set-topic="setTopic"
              :show-parent="true"
              :show-replies="false"
            />
          </template>
        </q-scroll-area>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import marked from 'marked'
import DOMPurify from 'dompurify'

import { AgoraMessage } from '../cashweb/types/agora'
import { defineComponent } from 'vue'
import { mapGetters, mapActions, mapMutations } from 'vuex'
import AMessage from '../components/agora/AgoraMessage.vue'

export default defineComponent({
  props: {},
  components: {
    AMessage
  },
  mounted () {
    this.refreshContent()
  },
  data () {
    return { }
  },
  emits: ['toggleMyDrawerOpen'],
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
    formatSatoshis (value: number) {
      return (value / 1_000_000).toFixed(2)
    },
    refreshContent () {
      this.refreshMessages({ wallet: this.$wallet, topic: this.selectedTopic })
    },
    markedMessage (text: string) {
      const html = DOMPurify.sanitize(marked(text))
      return html
    },
    setTopic (text: string) {
      this.selectedTopic = text
      this.refreshContent()
    },
    formatAddress (address:string) {
      return address.substring(6, 12) + '...' + address.substring(address.length - 6, address.length)
    },
    replyToMessage (payloadDigest: string) {
      console.log(payloadDigest)
    }
  },
  computed: {
    ...mapGetters({
      getMessages: 'agora/getMessages',
      topics: 'agora/getTopics',
      getSelectedTopic: 'agora/getSelectedTopic'
    }),
    messages () {
      return this.getMessages.filter((message: AgoraMessage) =>
        message.entries.some((entry) => entry.kind === 'post')
      )
    },
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
