<template>
  <div style="border-top: 1px solid black">
    <div class="row">
      <router-link
        :to="`/chat/${message.poster}`"
        class="q-pa-none q-ma-none"
        style="text-decoration: none"
      >
        <div v-if="haveContact(message.poster)">
          {{ getContactProfile(message.poster)?.name }}
        </div>
        <div v-else>{{ formatAddress(message.poster) }}</div>
      </router-link>
      <q-space />
      <span>{{ formatSatoshis(message.satoshis) }} XPI</span>
      <span class="q-ma-none q-pa-none q-pl-sm">
        {{ timestamp }}
        <q-tooltip>{{ fullTimestamp }}</q-tooltip>
      </span>
    </div>

    <template v-for="(entry, index) in message.entries" :key="index">
      <div
        :v-if="entry.kind === 'post'"
        class="q-ma-none q-pa-none col-grow q-ml-lg"
      >
        <a
          :href="entry.url"
          target="_blank"
          v-if="entry.url"
          class="post-title"
          >{{ entry.title || 'untitled' }}</a
        >
        <span class="mdstyle" v-html="markedMessage(entry.message)" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import moment from 'moment'
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import { renderMarkdown } from '../../utils/markdown'
import { useContactStore } from 'src/stores/contacts'

import { ForumMessage } from '../../cashweb/types/forum'

export default defineComponent({
  setup() {
    const contactStore = useContactStore()

    return {
      getContactProfile: contactStore.getContactProfile,
      haveContact: contactStore.haveContact,
    }
  },
  props: {
    message: {
      default: () => ({
        poster: undefined,
        satoshis: 0,
        replies: [],
        entries: [],
        payloadDigest: undefined,
        topic: '',
      }),
      type: Object as PropType<ForumMessage>,
    },
  },
  methods: {
    formatSatoshis(value: number) {
      return (value / 1_000_000).toFixed(0)
    },
    markedMessage(text?: string) {
      return renderMarkdown(text ?? '', this.$q.dark.isActive)
    },
    formatAddress(address: string) {
      return '...' + address.substring(address.length - 10, address.length)
    },
  },
  computed: {
    timestamp() {
      if (!this.message) {
        return ''
      }
      const howLongAgo = moment(this.message?.timestamp)
      return howLongAgo.calendar(null, {
        sameDay: 'HH:mm:ss',
        nextDay: '[Tomorrow] HH:mm:ss',
        nextWeek: 'dddd',
        lastDay: 'HH:mm:ss',
        lastWeek: '[Last] dddd',
        sameElse: 'DD/MM/YYYY',
      })
    },
    fullTimestamp() {
      return this.message
        ? moment(this.message?.timestamp).format('YYYY-MM-DD HH:mm:ss')
        : ''
    },
  },
})
</script>

<style scoped>
:deep() .mdstyle img {
  max-width: 100%;
  max-height: 448px;
}
:deep() .mdstyle pre,
code,
table {
  /*overflow-wrap: break-word;*/
  max-width: 100%;
  white-space: pre-wrap;
}
:deep() .mdstyle p {
  max-width: 100%;
  word-break: break-word;
}
:deep() .mdstyle h1,
h2,
h3,
h4 {
  font-size: 120%;
  font-weight: bold;
  line-height: inherit;
}
</style>
