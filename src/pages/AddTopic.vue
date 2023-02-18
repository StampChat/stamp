<template>
  <q-page-container>
    <q-page class="q-ma-none q-pa-sm">
      <q-card>
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
              val => val.length > 3 || $t('newTopicDialog.topicNameMinLength'),
              val =>
                /^[a-zA-Z0-9.]+$/.test(val) ||
                $t('newTopicDialog.topicNameRules'),
            ]"
            :placeholder="$t('newTopicDialog.enterTopic')"
            ref="topicInput"
            @keydown.enter.prevent="addTopic()"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            :label="$t('newTopicDialog.cancel')"
            color="negative"
            @click="cancel"
          />
          <q-btn
            :disable="topic === ''"
            :label="$t('newTopicDialog.add')"
            color="primary"
            @click="addTopic()"
          />
        </q-card-actions>
      </q-card>
    </q-page>
  </q-page-container>
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
