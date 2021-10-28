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
          The Agora
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <q-scroll-area
          ref="chatScroll"
          class="q-px-sm absolute full-width full-height"
        >
          <div class="q-ma-sm row">
            <q-btn
              class="col-shrink"
              align="left"
              v-if="!$status.setup"
              icon="login"
              label="Sign up"
              @click="$router.push('/setup').catch(() => {
              // Don't care. Probably duplicate route
              })"
            />
            <q-btn
              class="col-shrink"
              color="primary"
              v-if="!$status.setup"
              label="See Changelog"
              @click="$router.push('/changelog').catch(() => {
              // Don't care. Probably duplicate route
              })"
            />
            <q-space />
            <q-input
              filled
              class="col-shrink q-mx-sm q-pa-none"
              v-model="selectedTopic"
              label="Topic"
              style="width: 250px"
              @keyup.enter.prevent="refreshContent"
            />
            <q-btn
              class="col-shrink q-mx-sm q-pa-sm"
              label="Create Post"
              v-if="!!$status.setup"
              @click="$router.push('/create-post').catch(() => {
              // Don't care. Probably duplicate route
              })"
            />
          </div>

          <template
            v-for="(message) in messages"
            :key="message.payloadHash"
          >
            <q-card
              class="q-ma-sm q-pa-none"
              flat
              bordered
            >
              <q-card-section
                class="row"
                horizontal
              >
                <q-card-section>
                  <div class="col-shrink">
                    {{ formatSatoshis(message.satoshis) }}
                  </div>
                </q-card-section>
                <q-separator vertical />
                <q-card-section
                  class="q-ma-none q-pa-none col"
                  vertical
                >
                  <q-card-section
                    class="q-ma-none q-pa-sm col-grow"
                    horizontal
                  >
                    <q-btn
                      no-caps
                      flat
                      stretch
                      padding="1px"
                      :to="`/chat/${message.poster}`"
                    >
                      <div
                        v-if="haveContact(message.poster)"
                      >
                        {{ getContactProfile(message.poster).name }}
                      </div>
                      <div v-else>
                        {{ message.poster }}
                      </div>
                    </q-btn>
                    <q-space />
                    <q-btn
                      no-caps
                      flat
                      stretch
                      padding="1px"
                      @click.prevent="setTopic(message.topic)"
                      :label="message.topic"
                    />
                  </q-card-section>

                  <q-separator horizontal />

                  <template
                    v-for="(entry, index) in message.entries.filter(entry=> entry.kind === 'post')"
                    :key="index"
                  >
                    <q-card-section class="q-ma-none q-pa-sm col-grow text-bold">
                      <a
                        :href="entry.url"
                        v-if="entry.url"
                      >{{ entry.title }}</a>
                      <span v-if="!entry.url">{{ entry.title }}</span>
                    </q-card-section>
                    <q-card-section class="q-ma-none q-pa-sm col-grow">
                      <span
                        class="mdstyle"
                        v-html="markedMessage(entry.message)"
                      />
                    </q-card-section>
                  </template>
                </q-card-section>
              </q-card-section>
            </q-card>
          </template>
        </q-scroll-area>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import marked from 'marked'
import DOMPurify from 'dompurify'

import { AgoraMessage } from 'src/cashweb/types/agora'
import { defineComponent } from 'vue'
import { mapGetters, mapActions, mapMutations } from 'vuex'
import { formatBalance } from '../utils/formatting'

export default defineComponent({
  props: {},
  components: {},
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
      return formatBalance(value)
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
    }
  },
  computed: {
    ...mapGetters({
      getMessages: 'agora/getMessages',
      topics: 'agora/getTopics',
      getContactProfile: 'contacts/getContactProfile',
      haveContact: 'contacts/haveContact',
      getSelectedTopic: 'agora/getSelectedTopic'
    }),
    messages () {
      return this.getMessages.filter((message: AgoraMessage) =>
        message.entries.some((entry) => entry.kind === 'post')
      )
    },
    selectedTopic: {
      set (newVal: string) {
        this.setSelectedTopic(newVal)
      },
      get (): string {
        return this.getSelectedTopic
      }
    }
  }
})
</script>

<style scoped>
  :deep() .mdstyle img {
    max-width: 100%;
    max-height: 448px;
  }
  :deep() .mdstyle pre, code, table {
    /*overflow-wrap: break-word;*/
    max-width: 100%;
    white-space: pre-wrap;
  }
  :deep() .mdstyle p {
    max-width: 100%;
    word-break: break-all;
  }
</style>
