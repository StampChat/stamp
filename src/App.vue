<template>
  <router-view />
</template>

<script lang="ts">
import assert from 'assert'
import axios from 'axios'
import { defineComponent } from 'vue'
import { useTopicStore } from './stores/topics'

export default defineComponent({
  setup() {
    /**
     * Setup default localized topics
     */
    axios({
      method: 'get',
      url: 'https://json.geoiplookup.io/',
      responseType: 'json',
    }).then(response => {
      if (response.status !== 200) {
        return
      }
      const topicStore = useTopicStore()
      const { country_code, region, district } = response.data
      const topicParts = [country_code, region, district] as string[]
      const topics = topicParts.reduce(
        (topics, topicPart) => {
          const lastTopic = topics.pop()
          assert(lastTopic !== undefined, 'Should be world')
          const normalizedTopicPart = topicPart
            .trim()
            .toLowerCase()
            .replace(/\s/, '-')
          const joinedTopic = [lastTopic, normalizedTopicPart].join('.')
          return [...topics, lastTopic, joinedTopic]
        },
        ['world'],
      )
      for (const topic of topics) {
        topicStore.ensureTopic(topic)
      }
      console.log('topics', topics)
    })
  },
})
</script>
