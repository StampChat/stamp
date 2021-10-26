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
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

export default defineComponent({
  props: {},
  data () {
    return {
      offering: 1,
      topic: '',
      title: '',
      url: null,
      message: ''
    }
  },
  computed: {
    ...mapGetters({
      selectedTopic: 'agora/getSelectedTopic'
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
      await this.postMessage({ wallet: this.$wallet, entry, satoshis: this.offering * 1_000_000, topic: this.topic })
      this.back()
    },
    back () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    }
  }
})
</script>
