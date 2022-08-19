<template>
  <q-card class="q-ma-sm">
    <q-card-section>
      <div class="text-h6">{{ $t('newTopicDialog.newTopic') }}</div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        valid
        v-model="topic"
        filled
        dense
        reactive-rules
        :rules="[
          val => val.length > 3 || 'Please use minimum of 3 characters',
          val =>
            /^[a-zA-Z0-9.]+$/.test(val) ||
            'A-Z, a-z, 0-9, and periods are the only valid characters',
        ]"
        :placeholder="$t('newTopicDialog.enterTopic')"
        ref="topicInput"
        @keydown.enter.prevent="addTopic()"
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn label="Cancel" color="negative" @click="cancel" />
      <q-btn
        :disable="topic === ''"
        label="Add"
        color="primary"
        @click="addTopic()"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { QInput } from 'quasar'

import { useTopicStore } from 'src/stores/topics'

export default defineComponent({
  setup() {
    const topicStore = useTopicStore()
    const router = useRouter()
    const topic = ref('')

    const cancel = () => {
      window.history.length > 1 ? router.go(-1) : router.push('/')
    }
    const addTopic = () => {
      if (!topic.value) {
        return
      }
      topicStore.ensureTopic(topic.value.toLowerCase())
      router.replace(`/topic/${topic.value}`)
    }
    return {
      topic,
      topicInput: ref<QInput | null>(null),
      addTopic,
      cancel,
    }
  },
  mounted() {
    if (!this.topicInput) {
      return
    }
    this.topicInput.focus()
  },
})
</script>
