<template>
  <div class="row">
    <div class="col">
      <!-- Original Sender Name -->
      <div class="q-mb-xs">
        <b>
          Forwarded from
          <span v-html="linkedName" @click="setActiveChat(senderAddress)" />
        </b>
      </div>
      <template v-for="(item, index) in items" :key="index">
        <chat-message-stealth
          v-if="item.type == 'stealth'"
          :amount="item.amount"
        />
        <chat-message-image v-if="item.type == 'image'" :image="item.image" />
        <chat-message-text v-if="item.type == 'text'" :text="item.text" />
      </template>
    </div>
  </div>
</template>

<script>
import ChatMessageText from './ChatMessageText.vue'
import ChatMessageImage from './ChatMessageImage.vue'
import ChatMessageStealth from './ChatMessageStealth.vue'
import { renderForwardTitle } from '../../../utils/markdown'
import { useChatStore } from 'src/stores/chats'

export default {
  name: 'ChatMessageForward',
  components: {
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
  },
  props: {
    senderName: {
      type: String,
      required: true,
    },
    senderAddress: {
      type: String,
      required: true,
    },
    items: {
      type: Array,
      required: true,
    },
  },
  setup() {
    const chatStore = useChatStore()
    return {
      setActiveChat: chatStore.setActiveChat,
    }
  },
  computed: {
    linkedName() {
      return renderForwardTitle(
        `[${this.senderName}](/#/chat/${this.senderAddress})`,
        this.$q.dark.isActive,
      )
    },
  },
}
</script>
