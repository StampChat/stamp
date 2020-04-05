<template>
  <q-page>
    <!-- Send file dialog -->
    <q-dialog
      v-model="sendFileOpen"
      persistent
    >
      <send-file-dialog :address="activeChat" />
    </q-dialog>

    <div class="col">
      <q-scroll-area
        ref="chatScroll"
        class="q-px-md row"
        :style="`background-image: url(statics/bg-default.jpg); background-size:cover; height: calc(100vh - ${inputHeight}px - ${replyHeight}px - ${tabHeight}px);`"
      >
        <q-chat-message
          class='q-py-sm'
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
        />
        <q-scroll-observer
          debounce="500"
          @scroll="scrollHandler"
        />
      </q-scroll-area>

      <!-- Reply box -->
      <div>
        <q-resize-observer @resize="onResizeReply" />
        <div class='q-pa-sm' v-if='getCurrentReply(activeChat)'>
          <div class='q-pa-sm bg-secondary row' style='border-radius: 5px;'>
            <chat-message-reply class='col' :item="firstItem(getCurrentReply(activeChat))" />
            <q-btn dense flat color="accent" icon="close" @click='setCurrentReply({ addr: activeChat, index: undefined })' />
          </div>
      </div>
      </div>

      <!-- Message box -->
      <div class="row">
        <q-resize-observer @resize="onResizeInput" />
        <q-toolbar class="bg-white q-pl-none">
          <q-btn
            dense
            flat
            color="primary"
            icon="attach_file"
            @click="sendFileOpen = true"
          />
          <q-input
            ref="inputBox"
            style="width: 100%;"
            dense
            borderless
            autogrow
            @keydown.enter.prevent="sendMessage"
            v-model="message"
            placeholder="Write a message..."
          />
          <q-space />
          <transition name="slide">
            <q-btn
              v-if="message != ''"
              dense
              flat
              color="primary"
              icon="send"
              @click="sendMessage"
            />
          </transition>
        </q-toolbar>
      </div>
    </div>
    <q-page-sticky
      position="top-right"
      :offset="[18, 18]"
    >
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
  </q-page>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ChatMessage from '../components/chat/ChatMessage.vue'
import SendFileDialog from '../components/dialogs/SendFileDialog.vue'
import ChatMessageReply from '../components/chat/ChatMessageReply.vue'
import { donationMessage } from '../utils/constants'

const scrollDuration = 500

export default {
  props: ['activeChat', 'messages', 'tabHeight'],
  components: {
    ChatMessage,
    SendFileDialog,
    ChatMessageReply
  },
  data () {
    return {
      inputHeight: 100,
      replyHeight: 0,
      sendFileOpen: false,
      bottom: true,
      donationMessage
    }
  },
  methods: {
    ...mapActions({
      readAll: 'chats/readAll',
      sendMessageVuex: 'chats/sendMessage',
      setInputMessage: 'chats/setInputMessage',
      setCurrentReply: 'chats/setCurrentReply'
    }),
    sendMessage () {
      if (this.message !== '') {
        let replyDigest = this.getCurrentReplyDigest(this.activeChat)
        this.sendMessageVuex({ addr: this.activeChat, text: this.message, replyDigest })
        this.message = ''
        this.setCurrentReply({ addr: this.activeChat, index: undefined })
        this.$nextTick(() => this.$refs.inputBox.focus())
      }
    },
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      const scrollTarget = scrollArea.getScrollTarget()
      this.$nextTick(() => scrollArea.setScrollPosition(scrollTarget.scrollHeight, scrollDuration))
    },
    onResizeInput (size) {
      this.inputHeight = size.height
    },
    onResizeReply (size) {
      this.replyHeight = size.height
    },
    getContact (outbound) {
      if (outbound) {
        return this.getMyProfile
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
    firstItem (msg) {
      if (msg) {
        const firstNonReply = msg.items.find(item => item.type !== 'reply')
        return firstNonReply
      }
    }
  },
  computed: {
    ...mapGetters({
      getContactVuex: 'contacts/getContact',
      getInputMessage: 'chats/getInputMessage',
      getMyProfile: 'myProfile/getMyProfile',
      getCurrentReplyDigest: 'chats/getCurrentReplyDigest',
      getCurrentReply: 'chats/getCurrentReply'
    }),
    message: {
      set (text) {
        this.setInputMessage({ addr: this.activeChat, text })
      },
      get () {
        return this.getInputMessage(this.activeChat)
      }
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
