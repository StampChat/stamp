<template>
  <div class="row">
    <div class="col">
      <!-- Original Sender Name -->
      <div class="q-mb-xs">
        <b>
          Forwarded from
          <span v-html="linkedName" @click="vuexSetActiveChat(address)" />
        </b>
      </div>
      <template v-for="(item, index) in content" :key="index">
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
import { mapActions } from 'vuex'

export default {
  name: 'ChatMessageForward',
  components: {
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
  },
  props: {
    from: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    content: {
      type: Array,
      required: true,
    },
  },
  methods: {
    ...mapActions({
      vuexSetActiveChat: 'chats/setActiveChat',
    }),
  },
  computed: {
    linkedName() {
      return renderForwardTitle(
        `[${this.from}](/#/chat/${this.address})`,
        this.$q.dark.isActive,
      )
    },
  },
}
</script>
