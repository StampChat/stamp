<template>
  <input
    v-if="this.scroll.digest"
    hidden
  />
  <q-scroll-area
    ref="chatScroll"
    @scroll="scrollHandler"
    class="q-px-none absolute full-width full-height"
  >
    <div
      class="row q-px-lg"
      style="max-width: 720px"
    >
      <template
        v-for="(msg, index) in chunkedMessages"
        :key="msg.payloadDigest"
      >
        <chat-message
          :index="index"
          :message="msg"
          :address="address"
          :name="getContact(msg.outbound).name"
          :ref="msg.payloadDigest"
          @replyClicked="({ address, payloadDigest }) => setReply(payloadDigest)"
          @replyDivClick="scrollToMessage"
        />
      </template>
    </div>
    <!--
    <template
      v-for="({ chunk, globalIndex }, index) in chunkedMessages"
      :key="index"
    >
      <chat-message-stack
        v-if="chunk[0]"
        :address="address"
        :messages="chunk"
        :global-index="globalIndex"
        :contact="getContact(chunk[0].outbound)"
        :name-color="chunk[0].outbound ? '': `color: ${nameColor};`"
        v-bind="$attrs"
        @replyClicked="({ address, payloadDigest }) => setReply(payloadDigest)"
      />
    </template>
    -->
  </q-scroll-area>
  <q-page-sticky
    position="bottom-right"
    :offset="[18, 18]"
    v-show="!bottom"
  >
    <q-btn
      round
      size="md"
      icon="arrow_downward"
      @mousedown.prevent="buttonScrollBottom"
      color="accent"
    />
  </q-page-sticky>

  <q-footer bordered>
    <div
      v-if="!!replyDigest"
      class="reply q-px-md q-pt-sm"
      ref="replyBox"
    >
      <!-- Reply box -->
      <div class="row justify-end">
        <div class="col-auto">
          <q-btn
            dense
            flat
            color="accent"
            icon="close"
            @click="setReply(null)"
          />
        </div>
      </div>
      <div class="row q-px-sm q-pt-sm">
        <div class="col-12">
          <chat-message-reply
            :payload-digest="replyDigest"
          />
        </div>
      </div>
    </div>

    <q-banner
      v-if="this.scroll.digest"
      :dark="this.$q.dark.isActive"
    >
      Loading more messages...
    </q-banner>
    <!-- Message box -->
    <chat-input
      @sendFileClicked="toSendFileDialog"
      @giveLotusClicked="$emit('giveLotusClicked')"
      ref="chatInput"
      v-model:message="message"
      v-model:stamp-amount="stampAmount"
      @sendMessage="sendMessage"
    />
  </q-footer>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
// import ChatMessageStack from '../components/chat/messages/ChatMessageStack.vue'
import ChatMessage from '../components/chat/messages/ChatMessage.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import ChatMessageReply from '../components/chat/messages/ChatMessageReply.vue'
// import ChatMessageText from '../components/chat/messages/ChatMessageText.vue'
// import ChatMessageImage from '../components/chat/messages/ChatMessageImage.vue'
// import ChatMessageStealth from '../components/chat/messages/ChatMessageStealth.vue'

import { addressColorFromStr } from '../utils/formatting'
import { insufficientStampNotify } from '../utils/notifications'
import { stampLowerLimit } from '../utils/constants'
// import { nextTick } from 'vue'

const scrollDuration = 0

export default {
  components: {
    // ChatMessageStack,
    ChatMessage,
    ChatMessageReply,
    // ChatMessageText,
    // ChatMessageImage,
    // ChatMessageStealth,
    ChatInput
  },
  beforeRouteUpdate (to, from, next) {
    this.address = to.params.address
    this.messagesToShow = 30
    next()
  },
  data () {
    console.log(this.$route.params.address)
    return {
      address: this.$route.params.address,
      bottom: true,
      messagesToShow: 30,
      loadingMessages: false,
      replyDigest: null,
      scroll: {
        digest: null
      },
      message: ''
    }
  },
  emits: ['giveLotusClicked', 'sendFileClicked'],
  mounted () {
    this.scrollBottom()
  },
  updated () {
    console.log('updated(): entered hook')
    if (this.scroll.digest) {
      // const digest = this.scroll.digest
      // this.scroll.digest = null
      this.$nextTick(function () {
        console.log('updated(): running $nextTick function')
        this.scrollToMessage(this.scroll.digest)
      })
    }
    console.log('updated(): exiting hook')
  },
  methods: {
    ...mapGetters({
      getAcceptancePrice: 'contacts/getAcceptancePrice',
      getStampAmount: 'chats/getStampAmount'
    }),
    ...mapActions({
      setStampAmount: 'chats/setStampAmount'
    }),
    toSendFileDialog (args) {
      this.$emit('sendFileClicked', args)
    },
    scrollHandler (details) {
      if (
        // Ten pixels from top
        details.verticalPosition <= 10
      ) {
        this.messagesToShow += 30
        return
      }
      // Set this afterwards, incase we were at the bottom already.
      // We want to ensure that we scroll!
      this.bottom = details.verticalSize - details.verticalPosition - details.verticalContainerSize <= 10
    },
    // Used by sticky QButton to scroll to bottom
    buttonScrollBottom () {
      const scrollArea = this.$refs.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      this.$nextTick(() => {
        scrollArea.setScrollPosition(
          'vertical',
          scrollTarget.scrollHeight,
          scrollDuration
        )
      })
    },
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      // If we're not at the bottom, and we're not at the top, leave the scroll
      // alone.
      if (!this.bottom && scrollTarget.scrollTop >= 10) {
        return
      }
      this.$nextTick(() => {
        scrollArea.setScrollPosition(
          'vertical',
          scrollTarget.scrollHeight,
          scrollDuration
        )
      })
    },
    scrollToMessage (digest) {
      console.log('scrollToMessage(): digest =', digest)
      // if no digest, it means message was deleted or otherwise can't be found
      if (!digest) {
        return
      }
      const message = this.$refs[digest]?.$el
      // if no message, scroll up to load more
      if (!message) {
        console.log('scrollToMessage(): digest not found in DOM')
        console.log('scrollToMessage(): setting scroll position to load more messages')
        // this.$refs.chatScroll.setScrollPosition('vertical', 9)
        this.messagesToShow += 30
        this.scroll.digest = null
        return this.$nextTick(function () {
          console.log('scrollToMessage(): setting this.scroll.digest')
          this.scroll.digest = digest
        })
        // return setTimeout(function () { this.scrollToMessage(digest) }.bind(this), 50)
      }
      console.log('scrollToMessage(): message.scrollIntoView()')
      message.scrollIntoView()
      this.scroll.digest = null
    },
    nameColor () {
      return addressColorFromStr(this.address)
    },
    sendMessage (message) {
      const stampAmount = this.getStampAmount()(this.address)
      const acceptancePrice = this.getAcceptancePrice()(this.address)
      if (stampAmount < acceptancePrice) {
        insufficientStampNotify()
      }
      if (message !== '') {
        this.$relayClient.sendMessage({
          address: this.address,
          text: message,
          replyDigest: this.replyDigest,
          stampAmount
        })
        this.message = ''
        this.replyDigest = null
        // After message send, scroll to bottom if not already there
        if (!this.bottom) {
          this.$nextTick(this.buttonScrollBottom)
        }
      }
    },
    getContact (outbound) {
      if (outbound) {
        return this.getProfile
      } else {
        return this.getContactVuex(this.address).profile
      }
    },
    setReply (payloadDigest) {
      console.log('setting reply')
      this.replyDigest = payloadDigest
    }
  },
  computed: {
    ...mapGetters({
      getContactVuex: 'contacts/getContact',
      getProfile: 'myProfile/getProfile',
      getMessageByPayload: 'chats/getMessageByPayload'
    }),
    ...mapState('chats', ['chats']),
    messages () {
      const activeChat = this.chats[this.address]
      return activeChat ? activeChat.messages : []
    },
    chunkedMessages () {
      // TODO: Improve stacking logic e.g. long durations between messages prevent stacking
      // TODO: Optimize this by progressively constructing it
      if (!this.messages) {
        return []
      }

      const length = Math.min(this.messages.length, this.messagesToShow)
      const start = this.messages.length - length
      const end = this.messages.length

      return this.messages.slice(start, end)
    },
    /* Old property
    chunkedMessages () {
      // TODO: Improve stacking logic e.g. long durations between messages prevent stacking
      // TODO: Optimize this by progressively constructing it
      if (!this.messages) {
        return []
      }

      const length = Math.min(this.messages.length, this.messagesToShow)
      const start = this.messages.length - length
      const end = this.messages.length

      const { chunks, currentChunk, globalIndex } = this.messages.slice(start + 1, end).reduce(({ chunks, currentChunk, globalIndex }, message) => {
        if (currentChunk[0].senderAddress === message.senderAddress) {
          currentChunk.push(message)
          return { chunks, currentChunk, globalIndex: globalIndex }
        } else {
          chunks.push({ chunk: currentChunk, globalIndex: globalIndex })
          return { chunks, currentChunk: [message], globalIndex: globalIndex + currentChunk.length }
        }
      }, { chunks: [], currentChunk: [this.messages[start]], globalIndex: start })

      chunks.push({ chunk: currentChunk, globalIndex: globalIndex })
      return chunks
    },
    */
    /*
    replyItem () {
      if (!this.replyDigest) {
        return null
      }
      const msg = this.getMessageByPayload(this.replyDigest)
      if (!msg) {
        return null
      }

      const firstNonReply = msg.items.find(item => item.type !== 'reply')

      // Focus input box
      this.$refs.chatInput.focusInput()

      return firstNonReply
    },
    replyName () {
      const replyAddress = this.getMessageByPayload(this.replyDigest).senderAddress
      if (replyAddress === this.$wallet.myAddress.toXAddress()) {
        return this.getProfile.name
      }
      const contact = this.getContactVuex(replyAddress)
      return contact.profile.name
    },
    replyColor () {
      const replyAddress = this.getMessageByPayload(this.replyDigest).senderAddress
      if (replyAddress === this.$wallet.myAddress.toXAddress()) {
        return 'black'
      }

      return this.addressColorFromStr(this.address)
    },
    */
    stampAmount: {
      set (stampAmount) {
        const stampAmountNumber = Math.max(stampLowerLimit, Number(stampAmount))
        this.setStampAmount({ address: this.address, stampAmount: stampAmountNumber })
      },
      get () {
        return Number(this.getStampAmount()(this.address))
      }
    }
  },
  watch: {
    'messages.length' () {
      // Scroll to bottom if user was already there.
      this.scrollBottom()
    },
    active (newActive) {
      if (!newActive) {
        return
      }
      // Focus input box
      // this.$refs.chatInput.focus()
      // Scroll to bottom only if the view was effectively in it's initial state.
      this.scrollBottom()
      // TODO: Scroll to last unread
    }
  }
}
</script>
