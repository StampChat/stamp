<template>
  <q-page>
    <div class="col">
      <q-scroll-area
        ref="chatScroll"
        class="q-px-md row"
        :style="`background-image: url(statics/bg-default.jpg); background-size:cover; height: calc(100vh - ${height}px - ${tabHeight}px); width: 100%;`"
      >
        <chat-message
          v-for="(chatMessage, index) in messages"
          v-bind:key="index"
          :message="chatMessage"
          :contact="getContact(chatMessage.outbound)"
        />
      </q-scroll-area>

      <div class="row">
        <q-resize-observer @resize="onResize" />
        <q-toolbar class="bg-white">
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
              color="blue"
              icon="send"
              @click="sendMessage"
            />
          </transition>
        </q-toolbar>
      </div>
    </div>
  </q-page>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ChatMessage from '../components/chat/ChatMessage.vue'

export default {
  props: ['activeChat', 'messages', 'tabHeight'],
  components: {
    ChatMessage
  },
  data () {
    return {
      height: 100
    }
  },
  methods: {
    ...mapActions({
      sendMessageVuex: 'chats/sendMessage',
      setInputMessage: 'chats/setInputMessage'
    }),
    sendMessage () {
      this.sendMessageVuex({ addr: this.activeChat, text: this.message })
      this.message = ''
      this.$nextTick(() => this.$refs.inputBox.focus())
    },
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      const scrollTarget = scrollArea.getScrollTarget()
      const duration = 300
      scrollArea.setScrollPosition(scrollTarget.scrollHeight, duration)
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
</style>
