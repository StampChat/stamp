<template>
  <q-page>
    <div class="column">
      <div
        class="row justify-center"
        style="background-image: url(statics/bg-default.jpg); background-size:cover; height: calc(100vh - 100px);"
      >
        <q-scroll-area
          class="q-px-md"
          style="width: 100%; max-width: 100%"
        >
          <chat-message
            v-for="(message, index) in messages"
            v-bind:key="index"
            :message="message"
            :targetAddr="getActiveChat"
          />
        </q-scroll-area>
      </div>

      <div class="row">
        <q-toolbar class="bg-white">
          <q-input
            ref="inputBox"
            style="width: 100%;"
            dense
            borderless
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
import ChatMessage from '../components/ChatMessage.vue'

export default {
  components: {
    ChatMessage
  },
  methods: {
    ...mapActions({
      sendMessageVuex: 'chats/sendMessage',
      switchOrder: 'chats/switchOrder',
      refreshChat: 'chats/refresh'
    }),
    ...mapGetters({
      getRelayClient: 'relayClient/getClient',
      getAddressStr: 'wallet/getMyAddressStr',
      getToken: 'relayClient/getToken'
    }),
    sendMessage () {
      this.sendMessageVuex({ addr: this.getActiveChat, text: this.message })
      this.switchOrder(this.getActiveChat)
      this.message = ''
      this.$nextTick(() => this.$refs.inputBox.focus())
    }
  },
  created () {
    // Start websocket listener
    let client = this.getRelayClient()
    client.setUpWebsocket(this.getAddressStr(), this.getToken())

    // Get historic messages
    this.refreshChat()
  },
  computed: {
    ...mapGetters({ getContact: 'contacts/getContact', getAllMessages: 'chats/getAllMessages', getActiveChat: 'chats/getActiveChat' }),
    messages () {
      if (this.getActiveChat !== null) {
        return this.getAllMessages(this.getActiveChat)
      } else {
        return []
      }
    }
  },
  data: function () {
    return {
      message: ''
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
