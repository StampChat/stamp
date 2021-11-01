<template>
  <q-card class="q-ma-sm">
    <q-card-section>
      <q-input
        label="Offering"
        v-model="offering"
        suffix="XPI"
      />
      <q-input
        label="Topic"
        :disable="!!getMessage(parentDigest)"
        v-model="topic"
      />
      <q-input
        label="Post Title"
        v-model="title"
      />
      <q-input
        label="URL"
        v-model="url"
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
        @click="post"
        label="Post"
        color="primary"
        class="q-ma-sm"
      />
    </q-card-actions>
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

import AMessage from '../components/agora/AgoraMessage.vue'

export default defineComponent({
  components: {
    AMessage
  },
  props: {},
  data () {
    const parentDigest = this.$route.params.parentDigest as string
    return {
      offering: 1,
      topic: (this.$store.state.agora.index)[parentDigest]?.topic ?? '',
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
      getMessage: 'agora/getMessage'
    })
  },
  methods: {
    ...mapActions({
      postMessage: 'agora/putMessage'
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
    }
  }
})
</script>
