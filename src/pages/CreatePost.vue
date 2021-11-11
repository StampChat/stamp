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
        <q-input
          label="Message"
          v-model="message"
          type="textarea"
        />
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
    />
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

import AMessage from '../components/forum/ForumMessage.vue'

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
    })
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
      await this.postMessage({ wallet: this.$wallet, entry, satoshis: this.offering * 1_000_000, topic: this.topic, parentDigest: this.parentDigest })
      this.back()
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
