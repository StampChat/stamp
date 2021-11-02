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
          <div class="text-bold text-center q-ma-sm">
            {{ timestamp }}
          </div>
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
          <q-card-section
            class="q-ma-none q-pa-sm col-grow"
            v-if="renderBody"
          >
            <span
              class="mdstyle"
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
              :to="`/agora/${message.payloadDigest}`"
            />
          </q-card-section>
          <q-card-section class="q-pa-none text-center">
            <q-btn
              flat
              no-caps
              padding="1"
              icon="reply"
              label="Reply"
              :to="`/create-post/${message.payloadDigest}`"
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
          <agora-message
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
import marked from 'marked'
import DOMPurify from 'dompurify'
import moment from 'moment'

import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapActions, mapGetters } from 'vuex'
import AMessageReplies from './AgoraMessageReplies.vue'

import { AgoraMessage } from '../../cashweb/types/agora'

export default defineComponent({
  props: {
    message: {
      default: () => ({ poster: undefined, satoshis: 0, replies: [], entries: [], payloadDigest: undefined, topic: '' }),
      type: Object as PropType<AgoraMessage>
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
  mounted () {
    if (!this.parentDigest) {
      return
    }
    this.fetchMessage({ wallet: this.$wallet, payloadDigest: this.parentDigest })
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
      fetchMessage: 'agora/fetchMessage',
      addOffering: 'agora/addOffering'
    }),
    formatSatoshis (value: number) {
      return (value / 1_000_000).toFixed(0)
    },
    markedMessage (text: string) {
      const html = DOMPurify.sanitize(marked(text))
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
      getMessages: 'agora/getMessages',
      getMessage: 'agora/getMessage',
      topics: 'agora/getTopics',
      getContactProfile: 'contacts/getContactProfile',
      haveContact: 'contacts/haveContact',
      getSelectedTopic: 'agora/getSelectedTopic'
    }),
    timestamp () {
      return this.message ? moment(this.message?.timestamp).format('YY-MM-DD HH:mm:ss') : ''
    },
    parentDigest () {
      return this.message?.parentDigest
    },
    parentMessage () {
      return this.getMessage(this.parentDigest)
    },
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
    word-break: break-word;
  }
  :deep() .mdstyle h1, h2, h3, h4 {
    font-size: 120%;
    font-weight: bold;
    line-height: inherit;
  }
</style>
