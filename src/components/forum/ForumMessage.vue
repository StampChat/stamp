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
            @click="addVotes(10)"
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
            @click="addVotes(-10)"
          />
        </q-card-section>
        <q-separator />
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
          <div class="text-bold text-center q-ma-sm">
            {{ timestamp }}
            <q-tooltip>
              {{ fullTimestamp }}
            </q-tooltip>
          </div>
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
          <q-card-section
            class="q-ma-none q-pa-sm col-grow"
            v-if="renderBody"
          >
            <span
              class="mdstyle"
              ref="mdrendered"
              v-html="markedMessage(entry.message)"
            />
          </q-card-section>
        </template>
        <q-separator />
        <q-card-section
          horizontal
        >
          <q-card-section class="q-pa-none text-center">
            <q-btn
              flat
              no-caps
              icon="forum"
              padding="1"
              :label="`${message.replies.length} replies`"
              :to="`/forum/${message.payloadDigest}`"
            />
          </q-card-section>
          <q-card-section class="q-pa-none text-center">
            <q-btn
              flat
              no-caps
              padding="1"
              icon="reply"
              label="Reply"
              :to="`/new-post/${message.payloadDigest}`"
            />
          </q-card-section>
        </q-card-section>

        <a-message-replies
          :messages="message.replies"
          v-if="showReplies"
        />
        <q-separator v-if="showParent && parentDigest && parentMessage" />
        <q-card-section
          v-if="showParent && parentDigest && parentMessage"
          class="q-pa-none"
        >
          <q-card-section class="q-pa-sm">
            In reply to:
          </q-card-section>
          <forum-message
            v-bind="$attrs"
            class="q-ma-none"
            :message="parentMessage"
            :show-replies="false"
            :render-body="false"
          />
        </q-card-section>
      </q-card-section>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { marked, renderer } from '../../utils/markdown'
import DOMPurify from 'dompurify'
import moment from 'moment'

import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapActions, mapGetters } from 'vuex'
import AMessageReplies from './ForumMessageReplies.vue'

import { ForumMessage } from '../../cashweb/types/forum'

export default defineComponent({
  props: {
    message: {
      default: () => ({ poster: undefined, satoshis: 0, replies: [], entries: [], payloadDigest: undefined, topic: '' }),
      type: Object as PropType<ForumMessage>
    },
    showParent: {
      default: false,
      type: Boolean
    },
    showReplies: {
      default: true,
      type: Boolean
    },
    renderBody: {
      default: true,
      type: Boolean
    }
  },
  components: {
    AMessageReplies
  },
  data () {
    return {
      timeoutId: undefined as (ReturnType<typeof setTimeout> | undefined),
      voteAmount: 0
    }
  },
  emits: ['setTopic'],
  methods: {
    ...mapActions({
      addOffering: 'forum/addOffering'
    }),
    formatSatoshis (value: number) {
      return (value / 1_000_000).toFixed(0)
    },
    markedMessage (text: string) {
      const html = DOMPurify.sanitize(marked(text, { renderer: renderer }), { ADD_ATTR: ['target'] })
      return html
    },
    formatAddress (address:string) {
      return address.substring(6, 12) + '...' + address.substring(address.length - 6, address.length)
    },
    addVotes (xpi: number) {
      this.voteAmount += xpi * 1_000_000
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
      }
      this.timeoutId = setTimeout(() => {
        if (this.voteAmount === 0) {
          return
        }
        console.log('Adding votes', { payloadDigest: this.message?.payloadDigest, satoshis: this.voteAmount })
        this.addOffering({ wallet: this.$wallet, payloadDigest: this.message?.payloadDigest, satoshis: this.voteAmount })
        this.voteAmount = 0
      }, 1_000)
    }
  },
  computed: {
    ...mapGetters({
      getMessages: 'forum/getMessages',
      getMessage: 'forum/getMessage',
      topics: 'forum/getTopics',
      getContactProfile: 'contacts/getContactProfile',
      haveContact: 'contacts/haveContact',
      getSelectedTopic: 'forum/getSelectedTopic'
    }),
    timestamp () {
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
        sameElse: 'DD/MM/YYYY'
      })
    },
    fullTimestamp () {
      return this.message ? moment(this.message?.timestamp).format('YYYY-MM-DD HH:mm:ss') : ''
    },
    parentDigest () {
      return this.message?.parentDigest
    },
    parentMessage () {
      return this.getMessage(this.parentDigest)
    },
    messages () {
      return this.getMessages.filter((message: ForumMessage) =>
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
    word-break: break-word;
  }
  :deep() .mdstyle h1, h2, h3, h4 {
    font-size: 120%;
    font-weight: bold;
    line-height: inherit;
  }
</style>
