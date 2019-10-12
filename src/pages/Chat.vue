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
          />
          <!-- <q-chat-message
              class="q-py-sm"
              avatar="https://cdn.quasar.dev/img/avatar4.jpg"
              v-for="(message, index) in messages"
              v-bind:key="index"
              :text="[message.body]"
              :sent="message.outbound"
              :stamp="unixToStamp(message.timestamp)"
            /> -->
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
    ...mapGetters({ getProfile: 'contacts/getProfile', getAllMessages: 'chats/getAllMessages', getActiveChat: 'chats/getActiveChat' }),
    ...mapActions({ sendMessageVuex: 'chats/sendMessage', switchOrder: 'chats/switchOrder' }),
    sendMessage () {
      this.sendMessageVuex({ addr: this.getActiveChat(), text: this.message })
      this.switchOrder(this.getActiveChat())
      this.message = ''
      this.$nextTick(() => this.$refs.inputBox.focus())
    }
  },
  computed: {
    messages () {
      return this.getAllMessages()(this.getActiveChat())
    },
    profile () {
      return this.getProfile()(this.getActiveChat())
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
