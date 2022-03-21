<template>
  <q-card>
    <q-card-section class="row items-center">
      <q-avatar icon="clear_all" color="red" text-color="white" />
      <span class="q-ml-sm"
        >{{ $t('clearHistoryDialog.message') }} {{ name }}?</span
      >
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('clearHistoryDialog.cancel')"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :label="$t('clearHistoryDialog.clear')"
        color="primary"
        v-close-popup
        @click="clearChat(address)"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useChatStore } from 'src/stores/chats'
export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    return {
      clearChat: chatStore.clearChat,
    }
  },
  props: {
    address: {
      type: String,
      default: () => '',
    },
    name: {
      type: String,
      default: () => '',
    },
  },
})
</script>
