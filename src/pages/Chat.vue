<template>
  <div>
    <!-- Send file dialog -->
    <q-dialog v-model="sendFileOpen" persistent>
      <send-file-dialog :address="activeChat" />
    </q-dialog>

    <q-scroll-area
      ref="chatScroll"
      class="q-px-md row"
      :style="`height: calc(100% - ${offsetHeight()}px); min-height: calc(100%-${offsetHeight()}px); background: lightblue`"
    >
      <q-chat-message
        class="q-py-sm"
        avatar="~/assets/cashweb-avatar.png"
        :sent="false"
        :text="[
            donationMessage
            ]"
        size="6"
      />
      <chat-message
        v-for="(chatMessage, index) in messages"
        :key="index"
        :address="activeChat"
        :message="chatMessage"
        :contact="getContact(chatMessage.outbound)"
        :index="index"
        :now="now"
      />
      <q-scroll-observer debounce="500" @scroll="scrollHandler" />
    </q-scroll-area>

    <!-- Reply box -->
    <div ref="replyBox">
      <div class="q-pa-sm" v-if="activeChat && getCurrentActiveReply">
        <div class="q-pa-sm bg-secondary row" style="border-radius: 5px;">
          <chat-message-reply class="col" :item="replyItem" />
          <q-btn
            dense
            flat
            color="accent"
            icon="close"
            @click="setCurrentReply({ addr: activeChat, index: null })"
          />
        </div>
      </div>
    </div>

    <!-- Message box -->
    <chat-input
      ref="chatInput"
      v-model="message"
      @sendMessage="sendMessage"
      @sendFileClicked="sendFileClicked"
    />
    <q-page-sticky position="top-right" :offset="[18, 18]">
      <transition name="fade">
        <q-btn
          v-if="!bottom"
          round
          size="md"
          icon="keyboard_arrow_down"
          color="accent"
          @click="scrollBottom"
        />
      </transition>
    </q-page-sticky>
  </div>
</template>

<script>
import moment from 'moment'
import { mapGetters, mapActions } from 'vuex'
import { dom } from 'quasar'
const { height } = dom

import ChatInput from '../components/chat/ChatInput.vue'
import ChatMessage from '../components/chat/ChatMessage.vue'
import SendFileDialog from '../components/dialogs/SendFileDialog.vue'
import ChatMessageReply from '../components/chat/ChatMessageReply.vue'
import { donationMessage } from '../utils/constants'

const scrollDuration = 500

export default {
  props: ['activeChat', 'messages'],
  components: {
    ChatMessage,
    SendFileDialog,
    ChatMessageReply,
    ChatInput
  },
  data () {
    return {
      timer: null,
      now: moment(),
      sendFileOpen: false,
      bottom: true,
      donationMessage
    }
  },
  created () {
    this.timer = setInterval(() => { this.now = moment() }, 60000)
  },
  destroyed () {
    clearTimeout(this.timer)
  },
  methods: {
    ...mapActions({
      readAll: 'chats/readAll',
      sendMessageVuex: 'chats/sendMessage',
      setInputMessage: 'chats/setInputMessage',
      setCurrentReply: 'chats/setCurrentReply'
    }),
    sendMessage (message) {
      if (message !== '') {
        let replyDigest = this.getCurrentReplyDigest(this.activeChat)
        this.sendMessageVuex({ addr: this.activeChat, text: message, replyDigest })
        this.message = ''
        this.setCurrentReply({ addr: this.activeChat, index: null })
        this.$nextTick(() => this.$refs.inputBox.focus())
      }
    },
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      if (scrollArea) {
        const scrollTarget = scrollArea.getScrollTarget()
        this.$nextTick(() => scrollArea.setScrollPosition(scrollTarget.scrollHeight, scrollDuration))
      }
    },
    sendFileClicked () {
      this.sendFileOpen = true
    },
    getContact (outbound) {
      if (outbound) {
        return this.getProfile
      } else {
        return this.getContactVuex(this.activeChat).profile
      }
    },
    scrollHandler (details) {
      const scrollArea = this.$refs.chatScroll
      const scrollTarget = scrollArea.getScrollTarget()
      if (scrollTarget.scrollHeight === details.position + scrollTarget.offsetHeight) {
        this.bottom = true
      } else {
        this.bottom = false
      }
    },
    offsetHeight () {
      // TODO: This isn't reactive enough. It's somewhat slow to recalculate
      const inputBoxHeight = this.$refs.chatInput ? height(this.$refs.chatInput.$el) : 50
      const replyHeight = this.$refs.replyBox ? height(this.$refs.replyBox) : 0
      return inputBoxHeight + replyHeight
    }
  },
  computed: {
    ...mapGetters({
      getContactVuex: 'contacts/getContact',
      getInputMessage: 'chats/getInputMessage',
      getProfile: 'myProfile/getProfile',
      getCurrentReplyDigest: 'chats/getCurrentReplyDigest',
      getCurrentActiveReply: 'chats/getCurrentActiveReply'
    }),
    message: {
      set (text) {
        this.setInputMessage({ addr: this.activeChat, text })
      },
      get () {
        return this.getInputMessage(this.activeChat) || ''
      }
    },
    replyItem () {
      let msg = this.getCurrentActiveReply
      if (msg) {
        const firstNonReply = msg.items.find(item => item.type !== 'reply')
        return firstNonReply
      }
      return null
    }
  },
  watch: {
    messages: function (newMsgs, oldMsgs) {
      this.scrollBottom()
      if (Object.entries(newMsgs).length !== 0) {
        this.readAll(this.activeChat)
      }
    }
  }
}
</script>

<style scoped>
/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-enter-active {
  transition: all 0.3s ease;
}
.slide-leave-active {
  transition: all 0.3s;
}
.slide-enter, .slide-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(10px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
