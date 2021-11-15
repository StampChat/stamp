<template>
  <q-card class="q-ma-sm">
    <q-form @submit="post">
      <q-card-section>
        <q-input
          label="Offering"
          v-model="offering"
          suffix="XPI"
          :rules="[
            val => Number.parseFloat(val) || 'Invalid number'
          ]"
          lazy-rules
        />
        <q-input
          label="Topic"
          :disable="!!getMessage(parentDigest)"
          v-model="topic"
          :rules="[
            val => val && val.length >0 && (/^[a-z0-9.-]+$/).test(val) || 'Only numbers, lowercase, periods and dashes allowed',
            val => !val.split('.').some(val => val.length === 0) || 'Topic segments not allowed to be empty'
          ]"
          lazy-rules
        />
        <q-input
          label="Post Title"
          v-model="title"
        />
        <q-input
          label="URL"
          v-model="url"
          :rules="[
            val => !val || validateUrl(val) || 'Invalid URL'
          ]"
          lazy-rules
        />
        <q-card-section
          class="row q-pa-none"
        >
          <q-card-section
            class="col-xs-12 col-md q-pa-none q-pr-xs"
          >
            <q-input
              label="Message"
              v-model="message"
              type="textarea"
            />
          </q-card-section>

          <q-card-section
            class="col-xs-12 col-md-6 q-pa-none q-pt-md"
            v-show="this.message"
          >
            <div class="text-weight-bold text-caption">
              Message Preview
            </div>
            <q-card-section
              class="q-pa-none q-pt-xs"
            >
              <span
                class="mdstyle"
                v-html="markedMessage"
              />
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
        <q-btn
          type="submit"
          label="Post"
          color="primary"
          class="q-ma-sm"
        />
      </q-card-actions>
    </q-form>
  </q-card>

  <q-card
    class="q-ma-sm"
    v-if="getMessage(parentDigest)"
  >
    <q-card-section>
      Replying to:
    </q-card-section>
    <a-message
      :message="getMessage(parentDigest)"
      :show-replies="false"
      :compact="true"
    />
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'
import { toMarkdown } from '../utils/markdown'

import AMessage from '../components/forum/ForumMessage.vue'
import { errorNotify, infoNotify } from 'src/utils/notifications'

export default defineComponent({
  components: {
    AMessage
  },
  emits: ['setTopic'],
  props: {},
  data () {
    const parentDigest = this.$route.params.parentDigest as string
    return {
      offering: 10,
      topic: (this.$store.state.forum.index)[parentDigest]?.topic ?? '',
      title: '',
      url: null,
      message: '',
      parentDigest
    }
  },
  beforeRouteUpdate (to, from, next) {
    this.parentDigest = to.params.parentDigest as string
    next()
  },
  computed: {
    ...mapGetters({
      getMessage: 'forum/getMessage'
    }),
    markedMessage () {
      const text: string = this.message
      return toMarkdown(text)
    }
  },
  methods: {
    ...mapActions({
      postMessage: 'forum/putMessage'
    }),
    async post () {
      const entry = {
        kind: 'post',
        title: this.title,
        url: this.url ? this.url : null,
        message: this.message
      }
      console.log('posting message', entry)

      try {
        await this.postMessage({ wallet: this.$wallet, entry, satoshis: this.offering * 1_000_000, topic: this.topic, parentDigest: this.parentDigest })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        errorNotify(err)
        return
      } finally {
        this.back()
      }
      infoNotify('Post created!')
    },
    back () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
    validateUrl (val: string) {
      try {
        const url = new URL(val)
        return !!url
      } catch (err) {
        console.log(err)
        return false
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
