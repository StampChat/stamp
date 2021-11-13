<template>
  <q-scroll-area
    ref="chatScroll"
    @scroll="scrollHandler"
    class="q-px-none absolute full-width full-height"
  >
    <template v-for="({ chunk, globalIndex }, index) in chunkedMessages">
      <chat-message-stack
        v-if="chunk[0]"
        :key="index"
        :address="address"
        :messages="chunk"
        :global-index="globalIndex"
        :contact="getContact(chunk[0].outbound)"
        :name-color="chunk[0].outbound ? '': `color: ${nameColor};`"
        v-bind="$attrs"
        @replyClicked="({ address, payloadDigest }) => setReply(payloadDigest)"
      />
    </template>
  </q-scroll-area>
  <q-page-sticky
    position="bottom-right"
    :offset="[18, 18]"
    v-show="!bottom"
  >
    <q-btn
      round
      flat
      size="md"
      icon="arrow_downward"
      @mousedown.prevent="scrollBottom"
      color="accent"
    />
  </q-page-sticky>

  <q-footer bordered>
    <div
      v-if="!!replyDigest"
      class="reply col q-px-md q-pt-sm"
      ref="replyBox"
    >
      <!-- Reply box -->
      <div class="row">
        <div class="col text-weight-bold">
          {{ replyName }}
        </div>
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
        <chat-message-text
          v-if="replyItem.type=='text'"
          :text="replyItem.text"
        />
        <chat-message-image
          v-else-if="replyItem.type=='image'"
          :image="replyItem.image"
        />
        <chat-message-stealth
          v-else-if="replyItem.type=='stealth'"
          :amount="replyItem.amount"
        />
      </div>
    </div>

    <!-- Message box -->
    <chat-input
      @sendFileClicked="$emit('sendFileClicked')"
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
import ChatMessageStack from '../components/chat/messages/ChatMessageStack.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import ChatMessageText from '../components/chat/messages/ChatMessageText.vue'
import ChatMessageImage from '../components/chat/messages/ChatMessageImage.vue'
import ChatMessageStealth from '../components/chat/messages/ChatMessageStealth.vue'

import { addressColorFromStr } from '../utils/formatting'
import { insufficientStampNotify } from '../utils/notifications'
import { stampLowerLimit } from '../utils/constants'

const scrollDuration = 0

export default {
  components: {
    ChatMessageStack,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    ChatInput
  },
  beforeRouteUpdate (to, from, next) {
    this.address = to.params.address
    next()
  },
  data () {
    console.log(this.$route.params.address)
    return {
      address: this.$route.params.address,
      bottom: true,
      messagesToShow: 30,
      replyDigest: null,
      message: ''
    }
  },
  emits: ['giveLotusClicked', 'sendFileClicked'],
  mounted () {
    this.scrollBottom()
  },
  methods: {
    ...mapGetters({
      getAcceptancePrice: 'contacts/getAcceptancePrice',
      getStampAmount: 'chats/getStampAmount'
    }),
    ...mapActions({
      setStampAmount: 'chats/setStampAmount'
    }),
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
      this.$refs.chatInput.focus()

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
      this.$refs.chatInput.focus()
      // Scroll to bottom only if the view was effectively in it's initial state.
      this.scrollBottom()
      // TODO: Scroll to last unread
    }
  }
}
</script>
