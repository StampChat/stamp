<template>
  <q-scroll-area
    ref="chatScroll"
    @scroll="scrollHandler"
    class="q-px-none absolute full-width full-height column"
  >
    <div class="row q-px-lg">
      <template
        v-for="(msg, index) in chunkedMessages"
        :key="msg.payloadDigest"
      >
        <chat-message
          :index="index"
          :message="msg"
          :address="address"
          :name="getContact(msg.outbound).name"
          :chat-width="chatWidth"
          :payload-digest="msg.payloadDigest"
          :ref="msg.payloadDigest"
          @replyClicked="
            ({ address, payloadDigest }) => setReply(payloadDigest)
          "
          @replyDivClick="scrollToMessage"
        />
      </template>
    </div>
  </q-scroll-area>
  <q-page-sticky position="bottom-right" :offset="[18, 18]" v-show="!bottom">
    <q-btn
      round
      size="md"
      icon="arrow_downward"
      @mousedown.prevent="buttonScrollBottom"
      color="accent"
    />
  </q-page-sticky>
  <q-inner-loading
    :dark="$q.dark.isActive"
    :showing="!!scrollDigest"
    size="md"
    label="Loading more messages..."
  />
  <q-footer bordered>
    <div v-if="!!replyDigest" class="q-px-md q-pt-sm" ref="replyBox">
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
          <chat-message-reply :payload-digest="replyDigest" />
        </div>
      </div>
    </div>
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

<script lang="ts">
import { defineComponent, ref } from 'vue'

import ChatMessage from '../components/chat/messages/ChatMessage.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import ChatMessageReply from '../components/chat/messages/ChatMessageReply.vue'

import { addressColorFromStr } from '../utils/formatting'
import { insufficientStampNotify } from '../utils/notifications'
import { defaultAcceptancePrice, stampLowerLimit } from '../utils/constants'

import { debounce, QScrollArea } from 'quasar'

import { RouteLocationNormalized } from 'vue-router'
import { Message } from 'src/cashweb/types/messages'
import { useContactStore } from 'src/stores/contacts'
import { useProfileStore } from 'src/stores/my-profile'
import { useChatStore } from 'src/stores/chats'

const scrollDuration = 0

export default defineComponent({
  components: {
    ChatMessage,
    ChatMessageReply,
    ChatInput,
  },
  beforeRouteUpdate(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: () => void,
  ) {
    this.address = to.params.address as string
    this.messagesToShow = 30
    next()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeHandler)
  },
  data() {
    return {
      address: this.$route.params.address as string,
      bottom: true as boolean,
      messagesToShow: 30,
      replyDigest: null as string | null,
      scrollDigest: null as string | null,
      chatWidth: 0,
      message: '',
    }
  },
  setup() {
    const chats = useChatStore()
    const contacts = useContactStore()
    const myProfile = useProfileStore()

    return {
      getAcceptancePrice: contacts.getAcceptancePrice,
      getStampAmount: chats.getStampAmount,
      setStampAmount: chats.setStampAmount,
      getContactVuex: contacts.getContact,
      getProfile: myProfile,
      getMessageByPayload: chats.getMessageByPayload,
      chats: chats.chats,
      chatScroll: ref<QScrollArea | null>(null),
    }
  },
  emits: ['giveLotusClicked', 'sendFileClicked'],
  mounted() {
    this.scrollBottom()
    // set the chat width
    this.resizeHandler()
    // Adjust the chat width when window resizes
    window.addEventListener('resize', debounce(this.resizeHandler, 50))
  },
  updated() {
    this.$nextTick(() => {
      if (!this.scrollDigest) {
        return
      }
      this.scrollToMessage(this.scrollDigest)
    })
  },
  methods: {
    toSendFileDialog(args: unknown) {
      this.$emit('sendFileClicked', args)
    },
    resizeHandler() {
      const chatScroll = this.chatScroll
      if (!chatScroll || !chatScroll.$el) {
        return
      }
      this.chatWidth = chatScroll.$el.scrollWidth
    },
    scrollHandler(details: {
      verticalSize: number
      verticalContainerSize: number
      verticalPosition: number
    }) {
      if (
        // Ten pixels from top
        details.verticalPosition <= 10
      ) {
        this.messagesToShow += 30
        return
      }
      // Set this afterwards, incase we were at the bottom already.
      // We want to ensure that we scroll!
      this.bottom =
        details.verticalSize -
          details.verticalPosition -
          details.verticalContainerSize <=
        10
    },
    // Used by sticky QButton to scroll to bottom
    buttonScrollBottom() {
      const scrollArea = this.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      this.$nextTick(() => {
        scrollArea.setScrollPosition(
          'vertical',
          scrollTarget.scrollHeight,
          scrollDuration,
        )
      })
    },
    scrollBottom() {
      const scrollArea = this.chatScroll
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
          scrollDuration,
        )
      })
    },
    scrollToMessage(digest: string) {
      return debounce(() => {
        // if no digest, it means message was deleted or otherwise can't be found
        if (!digest) {
          return
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = (this.$refs as any)[digest]?.$el
        // if no message, load more, then try again
        if (!message) {
          this.scrollDigest = digest
          this.messagesToShow += 30
          return
        }
        // Scroll the message into view
        this.scrollDigest = null
        this.$nextTick(() => message.scrollIntoView({ behavior: 'smooth' }))
      }, 50)()
    },
    nameColor() {
      return addressColorFromStr(this.address)
    },
    sendMessage(message: string) {
      const stampAmount = this.getStampAmount(this.address)
      const acceptancePrice =
        this.getAcceptancePrice(this.address) ?? defaultAcceptancePrice
      if (stampAmount < acceptancePrice) {
        insufficientStampNotify()
      }
      if (!message) {
        return
      }
      this.$relayClient.sendMessage({
        address: this.address,
        text: message,
        replyDigest: this.replyDigest ?? undefined,
        stampAmount,
      })
      this.message = ''
      this.replyDigest = null
      // After message send, scroll to bottom if not already there
      if (!this.bottom) {
        this.$nextTick(this.buttonScrollBottom)
      }
    },
    getContact(outbound: boolean) {
      if (outbound) {
        return this.getProfile.profile
      } else {
        return this.getContactVuex(this.address)?.profile
      }
    },
    setReply(payloadDigest: string | null) {
      console.log('setting reply')
      this.replyDigest = payloadDigest
    },
  },
  computed: {
    messages(): Message[] {
      const activeChat = this.chats[this.address]
      return activeChat ? activeChat.messages : []
    },
    chunkedMessages() {
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
    stampAmount: {
      set(stampAmount: string | undefined) {
        const stampAmountNumber = Math.max(stampLowerLimit, Number(stampAmount))
        this.setStampAmount({
          address: this.address,
          stampAmount: stampAmountNumber,
        })
      },
      get() {
        return Number(this.getStampAmount(this.address))
      },
    },
  },
  watch: {
    'messages.length'() {
      // Scroll to bottom if user was already there.
      this.scrollBottom()
    },
    'active'(newActive) {
      if (!newActive) {
        return
      }
      // Scroll to bottom only if the view was effectively in it's initial state.
      this.scrollBottom()
      // TODO: Scroll to last unread
    },
  },
})
</script>

<style lang="scss" scoped>
:deep() .message-color {
  background-color: var(--q-message-color);
}
:deep() .message-color-sent {
  background-color: var(--q-message-color-sent);
}
</style>
