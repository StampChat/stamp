<template>
  <q-page-container>
    <q-page class="q-ma-none q-pa-sm">
      <q-card class="q-ma-sm">
        <q-form @submit="post">
          <q-card-section>
            <q-input
              label="Offering"
              v-model="offering"
              suffix="XPI"
              :rules="[val => Number.parseFloat(val) || 'Invalid number']"
              lazy-rules
            />
            <q-select
              label="Topic"
              :disable="!!getMessage(parentDigest)"
              v-model="topic"
              :options="topics"
              @filter="filterTopics"
              use-input
              @new-value="createValue"
              new-value-mode="add-unique"
              input-debounce="0"
              :rules="[
                val =>
                  (val && val.length > 0 && /^[a-z0-9.-]+$/.test(val)) ||
                  'Only numbers, lowercase, periods and dashes allowed',
                val =>
                  !val.split('.').some(val => val.length === 0) ||
                  'Topic segments not allowed to be empty',
              ]"
              lazy-rules
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No results</q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input label="Post Title" v-model="title" />
            <q-input
              label="URL"
              v-model="url"
              :rules="[val => !val || validateUrl(val) || 'Invalid URL']"
              lazy-rules
            />
            <q-card-section class="row q-pa-none">
              <q-card-section class="col-xs-12 col-md q-pa-none q-pr-xs">
                <q-input label="Message" v-model="message" type="textarea" />
              </q-card-section>

              <q-card-section
                class="col-xs-12 col-md-6 q-pa-none q-pt-md"
                v-show="this.message"
              >
                <div class="text-weight-bold text-caption">Message Preview</div>
                <q-card-section class="q-pa-none q-pt-xs">
                  <span class="mdstyle" v-html="markedMessage" />
                </q-card-section>
              </q-card-section>
            </q-card-section>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              @click="back"
              label="back"
              color="negative"
              class="q-ma-sm"
            />
            <q-btn type="submit" label="Post" color="primary" class="q-ma-sm" />
          </q-card-actions>
        </q-form>
      </q-card>

      <q-card class="q-ma-sm" v-if="getMessage(parentDigest)">
        <q-card-section>Replying to:</q-card-section>
        <a-message
          :message="getMessage(parentDigest)"
          :show-replies="false"
          :compact="true"
        />
      </q-card>
    </q-page>
  </q-page-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { storeToRefs } from 'pinia'

import { renderMarkdown } from '../utils/markdown'
import { useForumStore } from 'src/stores/forum'

import AMessage from '../components/forum/ForumMessage.vue'
import { errorNotify, infoNotify } from 'src/utils/notifications'

export default defineComponent({
  setup() {
    const forum = useForumStore()
    const { topics, getMessage } = storeToRefs(forum)
    return {
      getMessage: getMessage,
      availableTopics: topics,
      pushNewTopic: forum.pushNewTopic,
      postMessage: forum.putMessage,
    }
  },
  components: {
    AMessage,
  },
  emits: ['setTopic'],
  props: {},
  data() {
    const forum = useForumStore()
    const parentDigest = this.$route.params.parentDigest as string
    return {
      offering: 10,
      topic: forum.index[parentDigest]?.topic ?? '',
      topics: [] as string[],
      title: '',
      url: null,
      message: '',
      parentDigest,
    }
  },
  beforeRouteUpdate(to, from, next) {
    this.parentDigest = to.params.parentDigest as string
    next()
  },
  computed: {
    markedMessage() {
      const text: string = this.message
      return renderMarkdown(text, this.$q.dark.isActive)
    },
  },
  methods: {
    filterTopics(inputTopic: string, update: (arg: () => void) => void) {
      update(() => {
        this.topics = [
          inputTopic,
          ...this.availableTopics.filter(
            (topic: string) => topic.indexOf(inputTopic) > -1,
          ),
        ]
      })
    },
    createValue(
      val: string,
      done: (val: string, newValueMode: string) => void,
    ) {
      // Calling done(var) when newValueMode is "add-unique", or done(var, "add-unique")
      // adds "var" content to the model only if is not already set
      // and it resets the input textbox to empty string
      // https://quasar.dev/vue-components/select#example--filtering-and-adding-to-menu
      if (val.length > 0) {
        if (!this.availableTopics.includes(val)) {
          this.pushNewTopic(val)
        }
        done(val, 'add-unique')
      }
    },
    async post() {
      const entry = {
        kind: 'post' as const,
        title: this.title,
        url: this.url ? this.url : undefined,
        message: this.message,
      }
      console.log('posting message', entry)
      if (!entry) {
        console.error('entry is null in CreatePost.vue post handler')
        return
      }

      try {
        await this.postMessage({
          wallet: this.$wallet,
          entry,
          satoshis: this.offering * 1_000_000,
          topic: this.topic,
          parentDigest: this.parentDigest,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        errorNotify(err)
        return
      } finally {
        this.back()
      }
      infoNotify('Post created!')
    },
    back() {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
    validateUrl(val: string) {
      try {
        const url = new URL(val)
        return !!url
      } catch (err) {
        console.log(err)
        return false
      }
    },
  },
})
</script>

<style scoped>
:deep() .mdstyle img {
  max-width: 100%;
  max-height: 448px;
}
:deep() .mdstyle pre code {
  /*overflow-wrap: break-word;*/
  max-width: 100%;
  white-space: pre-wrap;
}
:deep() .mdstyle table {
  /*overflow-wrap: break-word;*/
  max-width: 100%;
  white-space: pre-wrap;
}
:deep() .mdstyle p {
  max-width: 100%;
  word-break: break-word;
}
:deep() .mdstyle h1 {
  font-size: 120%;
  font-weight: bold;
  line-height: inherit;
}
:deep() .mdstyle h2 {
  font-size: 120%;
  font-weight: bold;
  line-height: inherit;
}
:deep() .mdstyle h3 {
  font-size: 120%;
  font-weight: bold;
  line-height: inherit;
}
:deep() .mdstyle h4 {
  font-size: 120%;
  font-weight: bold;
  line-height: inherit;
}
</style>
