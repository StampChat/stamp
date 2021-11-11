<template>
  <div class="column full-height">
    <q-scroll-area
      class="col"
    >
      <q-list>
        <q-item>
          <q-input
            filled
            class="q-mx-sm q-pa-none"
            v-model="selectedTopic"
            label="Topic"
            style="width: 250px"
            @keyup.enter.prevent="refreshContent"
            clearable
          />
        </q-item>

        <q-item>
          <q-btn
            flat
            class="q-mx-sm q-pa-sm"
            label="Create Post"
            to="/new-post"
          />
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapMutations } from 'vuex'

export default defineComponent({
  components: {
  },
  data () {
    return {
      contactBookOpen: false
    }
  },
  methods: {
    ...mapActions({
      refreshMessages: 'forum/refreshMessages'
    }),
    ...mapMutations({
      setSelectedTopic: 'forum/setSelectedTopic'
    }),
    refreshContent () {
      this.refreshMessages({ wallet: this.$wallet, topic: this.selectedTopic })
    },
    setTopic (text: string) {
      this.selectedTopic = text
      this.refreshContent()
    }
  },
  computed: {
    ...mapGetters({
      topics: 'forum/getTopics',
      getSelectedTopic: 'forum/getSelectedTopic'
    }),
    selectedTopic: {
      set (newVal?: string) {
        this.setSelectedTopic(newVal ?? '')
        // If the contents were cleared then we should refresh.
        if (!newVal) {
          this.refreshContent()
        }
      },
      get (): string {
        return this.getSelectedTopic
      }
    }
  }
})
</script>
