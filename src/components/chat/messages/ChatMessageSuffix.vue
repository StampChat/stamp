<template>
  <div
    v-if="status === 'error'"
    :class="['row', 'items-center', suffixPlacement]"
  >
    <div v-if="outbound" :class="buttonPlacement">
      <chat-message-suffix-buttons
        :status="status"
        @resendClick="$emit('resendClick')"
      />
    </div>
    <div class="col-auto">
      <q-icon name="error" color="red" />Failed to send
    </div>
    <div v-if="!outbound" :class="buttonPlacement">
      <chat-message-suffix-buttons
        :status="status"
        @resendClick="$emit('resendClick')"
      />
    </div>
  </div>
  <div v-else :class="['row', 'items-center', suffixPlacement]">
    <!-- Button placement for sent mssages -->
    <div v-if="outbound" :class="buttonPlacement">
      <chat-message-suffix-buttons
        :status="status"
        @replyClick="$emit('replyClick')"
        @forwardClick="$emit('forwardClick')"
        @infoClick="$emit('infoClick')"
        @deleteClick="$emit('deleteClick')"
      />
    </div>
    <div class="col-auto q-pa-xs">
      {{ stamp }}
      <br />
      {{ amount }}
    </div>
    <!-- Button placement for received mssages -->
    <div v-if="!outbound" :class="buttonPlacement">
      <chat-message-suffix-buttons
        :status="status"
        @replyClick="$emit('replyClick')"
        @forwardClick="$emit('forwardClick')"
        @infoClick="$emit('infoClick')"
        @deleteClick="$emit('deleteClick')"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import ChatMessageSuffixButtons from './ChatMessageSuffixButtons.vue'

export default defineComponent({
  name: 'ChatMessageSuffix',
  components: {
    ChatMessageSuffixButtons,
  },
  props: {
    stamp: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    outbound: {
      type: Boolean,
      required: true,
    },
  },
  emits: [
    'replyClick',
    'forwardClick',
    'infoClick',
    'deleteClick',
    'resendClick',
  ],
  computed: {
    suffixPlacement(): string {
      return this.outbound ? 'text-right' : 'text-left'
    },
    buttonPlacement(): string[] {
      return this.outbound
        ? ['col-grow', 'q-mr-sm', 'text-left']
        : ['col-grow', 'q-ml-sm', 'text-right']
    },
  },
})
</script>
