<template>
  <q-card
    class="q-ma-sm q-pa-none"
    flat
    bordered
  >
    <q-card-section
      class="row"
      horizontal
    >
      <q-card-section
        class="col-shrink q-pa-none"
      >
        <q-card-section class="q-pa-none text-center">
          <q-btn
            flat
            icon="thumb_up"
            padding="0"
            disable
          />
        </q-card-section>
        <q-card-section class="q-pa-none text-center">
          {{ formatSatoshis(message.satoshis) }}
        </q-card-section>
        <q-card-section class="q-pa-none text-center">
          <q-btn
            flat
            icon="thumb_down"
            padding="0"
            disable
          />
        </q-card-section>
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
              {{ formatAddress(message.poster) }}
            </div>
          </q-btn>
          <q-space />
          <q-btn
            no-caps
            flat
            stretch
            padding="1px"
            @click.prevent="this.$emit('setTopic', message.topic)"
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

<script lang="ts">
import marked from 'marked'
import DOMPurify from 'dompurify'

import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapGetters } from 'vuex'

import { AgoraMessage } from '../../cashweb/types/agora'

export default defineComponent({
  props: {
    message: {
      default: undefined,
      type: Object as PropType<AgoraMessage | undefined>
    }
  },
  components: {},
  data () {
    return { }
  },
  emits: ['setTopic'],
  methods: {
    formatSatoshis (value: number) {
      return (value / 1_000_000).toFixed(0)
    },
    markedMessage (text: string) {
      const html = DOMPurify.sanitize(marked(text))
      return html
    },
    formatAddress (address:string) {
      return address.substring(6, 12) + '...' + address.substring(address.length - 6, address.length)
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
