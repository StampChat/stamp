<template>
  <q-card>
    <q-card-section class="row items-center">
      <q-avatar icon="delete" color="red" text-color="white" />
      <span class="q-ml-sm"
        >{{ $t('deleteChatDialog.message') }} {{ name }}?</span
      >
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('deleteChatDialog.cancel')"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :label="$t('deleteChatDialog.delete')"
        color="primary"
        v-close-popup
        @click="deleteChat(address)"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { useChatStore } from 'src/stores/chats'
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    return {
      deleteChat: chatStore.deleteChat,
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
