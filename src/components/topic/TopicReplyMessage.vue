<template>
  <div>
    <div class="row q-ma-none q-pa-none">
      <q-btn
        no-caps
        flat
        padding="0"
        :to="`/chat/${message.poster}`"
        class="q-pa-none q-mt-xs text-center"
      >
        <div v-if="haveContact(message.poster)">
          {{ getContactProfile(message.poster)?.name }}
        </div>
        <div v-else>{{ formatAddress(message.poster) }}</div>
      </q-btn>
      <q-space />
      <div class="row justify-end">
        <div class="col-auto">
          <q-btn
            no-caps
            flat
            padding="0"
            color="accent"
            icon="close"
            class="q-pa-none q-mt-xs text-center"
            @click="$emit('close-reply')"
          />
        </div>
      </div>
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
import { computed, defineComponent } from 'vue'
import type { PropType } from 'vue'

import { renderMarkdown } from '../../utils/markdown'
import { useContactStore } from 'src/stores/contacts'

import { ForumMessage } from '../../cashweb/types/forum'
import { useTopicStore } from 'src/stores/topics'

export default defineComponent({
  emits: ['close-reply'],
  setup(props) {
    const contactStore = useContactStore()

    return {
      timeoutId: null as ReturnType<typeof setTimeout> | null,
      voteAmount: 0,
      getContactProfile: contactStore.getContactProfile,
      haveContact: contactStore.haveContact,
      formttedAmount: computed(() => {
        return (props.message.satoshis / 1_000_000).toFixed(0)
      }),
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
      required: true,
    },
    topic: {
      required: true,
      type: String,
    },
  },
  methods: {
    markedMessage(text?: string) {
      return renderMarkdown(text ?? '', this.$q.dark.isActive)
    },
    formatAddress(address: string) {
      return '...' + address.substring(address.length - 10, address.length)
    },
    // FIXME: We shouldn't need to have this as a method, but we need the wallet.
    // Still need to implement a `useWallet` method.
    addVotes(votes: number) {
      const topicStore = useTopicStore()
      const topic = this.topic
      this.voteAmount += votes
      console.log('adding votes', this.voteAmount)
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
      }
      this.timeoutId = setTimeout(() => {
        if (this.voteAmount === 0) {
          return
        }
        console.log('Adding votes', {
          payloadDigest: this.message?.payloadDigest,
          satoshis: this.voteAmount,
        })
        topicStore.addOffering({
          wallet: this.$wallet,
          payloadDigest: this.message?.payloadDigest,
          satoshis:
            this.voteAmount * (topicStore.topics[topic]?.offering ?? 1_000_000),
          topic,
        })
        this.voteAmount = 0
      }, 1_000)
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
