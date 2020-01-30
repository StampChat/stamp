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
        :style="`background-image: url(statics/bg-default.jpg); background-size:cover; height: calc(100vh - ${height}px - ${tabHeight}px); width: 100%;`"
      >
        <chat-message
          v-for="(chatMessage, index) in messages"
          :key="index"
          :message="chatMessage"
          :contact="getContact(chatMessage.outbound)"
        />
        <q-scroll-observer
          debounce="500"
          @scroll="scrollHandler"
        />
      </q-scroll-area>

      <div class="row">
        <q-resize-observer @resize="onResize" />
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

const scrollDuration = 500

export default {
  props: ['activeChat', 'messages', 'tabHeight'],
  components: {
    ChatMessage,
    SendFileDialog
  },
  data () {
    return {
      height: 100,
      sendFileOpen: false,
      bottom: true
    }
  },
  methods: {
    ...mapActions({
      readAll: 'chats/readAll',
      sendMessageVuex: 'chats/sendMessage',
      setInputMessage: 'chats/setInputMessage'
    }),
    sendMessage () {
      if (this.message !== '') {
        this.sendMessageVuex({ addr: this.activeChat, text: this.message })
        this.message = ''
        this.$nextTick(() => this.$refs.inputBox.focus())
      }
    },
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      const scrollTarget = scrollArea.getScrollTarget()
      this.$nextTick(() => scrollArea.setScrollPosition(scrollTarget.scrollHeight, scrollDuration))
    },
    onResize (size) {
      this.height = size.height
    },
    getContact (outbound) {
      if (outbound) {
        return this.getMyProfile
      } else {
        return this.getContactVuex(this.activeChat)
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
    }
  },
  computed: {
    ...mapGetters({
      getContactVuex: 'contacts/getContact',
      getInputMessage: 'chats/getInputMessage',
      getMyProfile: 'myProfile/getMyProfile'
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
    },
    activeChat: function (newAddr, oldAddr) {
      this.readAll(newAddr)
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
