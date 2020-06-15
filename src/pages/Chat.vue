<template>
  <q-layout ref="chatLayout" view="lhh LpR lff" container class="hide-scrollbar absolute full-width">
    <!-- Send file dialog -->
    <!-- TODO: Move this up.  We don't need a copy of this dialog for each address (likely) -->
    <q-dialog v-model="sendFileOpen" persistent>
      <send-file-dialog :address="address" />
    </q-dialog>

    <!-- Send money dialog -->
    <q-dialog v-model="sendMoneyOpen" persistent>
      <send-bitcoin-dialog :address="address" :contact="contactProfile" />
    </q-dialog>

    <q-header>
      <q-toolbar class="q-pl-sm">
        <q-avatar rounded>
          <img :src="contactProfile.avatar" />
        </q-avatar>
        <q-toolbar-title class="h6"> {{ contactProfile.name }} </q-toolbar-title>
        <q-space />
        <q-btn class="q-px-sm" flat dense @click="toggleContactDrawerOpen" icon="person" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <q-scroll-area ref="chatScroll" @scroll=scrollHandler class="q-px-none absolute full-width full-height">
          <anouncement
            class='q-pt-sm'
            name="Stamp Developers"
            :text="donationMessage"
          />
          <template v-if="loaded || active">
            <template v-for="({ chunk, globalIndex }, index) in chunkedMessages">
              <chat-message-stack
                v-if="chunk[0]"
                :key="index"
                :address="address"
                :messages="chunk"
                :globalIndex="globalIndex"
                :contact="getContact(chunk[0].outbound)"
                :nameColor="chunk[0].outbound ? '': `color: ${nameColor};`"
                @replyClicked="({ address, payloadDigest }) => setReply(payloadDigest)"
              />
            </template>
          </template>
        </q-scroll-area>
        <q-page-sticky position="bottom-right" :offset="[18, 18]" v-show="!bottom">
          <q-btn round size="md" icon="keyboard_arrow_down" color="accent" @click="scrollBottom" />
        </q-page-sticky>
      </q-page>
    </q-page-container>

    <q-footer bordered>
      <div
        v-if="!!replyDigest"
        class='reply col q-px-md q-pt-sm'
        ref="replyBox"
      >
        <!-- Reply box -->
        <div class='row'>
          <div class='col text-weight-bold'> {{ replyName }} </div>
            <div class='col-auto'>
              <q-btn dense flat color="accent" icon="close" @click="setReply(null)" />
            </div>
        </div>
        <div class='row q-px-sm q-pt-sm'>
          <chat-message-text v-if="replyItem.type=='text'" :text="replyItem.text" />
          <chat-message-image v-else-if="replyItem.type=='image'" :image="replyItem.image" />
          <chat-message-stealth v-else-if="replyItem.type=='stealth'" :amount="replyItem.amount" />
        </div>
      </div>

      <!-- Message box -->
      <chat-input
        ref="chatInput"
        v-model="message"
        v-bind:stampAmount="stampAmount"
        @sendMessage="sendMessage"
        @sendFileClicked="sendFileOpen = true"
        @sendMoneyClicked="sendMoneyOpen = true"
        @stampAmountChanged="stampAmountChanged"
      />
    </q-footer>
  </q-layout>
</template>

<script>
import moment from 'moment'
import { mapGetters, mapActions } from 'vuex'

import Anouncement from '../components/chat/messages/Announcement.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import ChatMessageStack from '../components/chat/messages/ChatMessageStack.vue'
import SendFileDialog from '../components/dialogs/SendFileDialog.vue'
import ChatMessageText from '../components/chat/messages/ChatMessageText.vue'
import ChatMessageImage from '../components/chat/messages/ChatMessageImage.vue'
import ChatMessageStealth from '../components/chat/messages/ChatMessageStealth.vue'
import SendBitcoinDialog from '../components/dialogs/SendBitcoinDialog.vue'
import { donationMessage } from '../utils/constants'
import { insufficientStampNotify } from '../utils/notifications'

const scrollDuration = 0

export default {
  props: {
    address: String,
    messages: {
      type: Array,
      default: () => []
    },
    loaded: {
      type: Boolean,
      default: () => false
    },
    active: {
      type: Boolean,
      default: () => false
    }
  },
  components: {
    Anouncement,
    ChatMessageStack,
    ChatMessageText,
    ChatMessageImage,
    ChatMessageStealth,
    SendFileDialog,
    ChatInput,
    SendBitcoinDialog
  },
  data () {
    return {
      timer: null,
      now: moment(),
      sendFileOpen: false,
      sendMoneyOpen: false,
      bottom: true,
      message: '',
      replyDigest: null,
      donationMessage
    }
  },
  created () {
    this.timer = setInterval(() => {
      this.now = moment()
    }, 60000)
  },
  destroyed () {
    clearTimeout(this.timer)
  },

  methods: {
    ...mapGetters({
      getAcceptancePrice: 'contacts/getAcceptancePrice',
      getStampAmount: 'chats/getStampAmount'
    }),
    ...mapActions({
      setStampAmount: 'chats/setStampAmount'
    }),
    sendMessage (message) {
      const stampAmount = this.getStampAmount()(this.address)
      const acceptancePrice = this.getAcceptancePrice()(this.address)
      if (stampAmount < acceptancePrice) {
        insufficientStampNotify()
      }
      if (message !== '') {
        this.$relayClient.sendMessage({
          addr: this.address,
          text: message,
          replyDigest: this.replyDigest,
          stampAmount
        })
        this.message = ''
        this.replyDigest = null
        this.$nextTick(() => this.$refs.chatInput.$el.focus())
      }
    },
    stampAmountChanged (stampAmount) {
      const stampAmountNumber = Number(stampAmount)
      this.setStampAmount({ addr: this.address, stampAmount: stampAmountNumber })
    },
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      const scrollTarget = scrollArea.getScrollTarget()
      this.$nextTick(() =>
        scrollArea.setScrollPosition(
          scrollTarget.scrollHeight,
          scrollDuration
        )
      )
    },
    getContact (outbound) {
      if (outbound) {
        return this.getProfile
      } else {
        return this.getContactVuex(this.address).profile
      }
    },
    scrollHandler (details) {
      if (
        // Ten pixels from bottom
        details.verticalSize - details.verticalPosition - details.verticalContainerSize <= 10
      ) {
        this.bottom = true
      } else {
        this.bottom = false
      }
    },
    setReply (payloadDigest) {
      this.replyDigest = payloadDigest
    },
    shouldShowHeader (message, previousMessage) {
      if (previousMessage === undefined) {
        return true
      }
      return previousMessage.senderAddress !== message.senderAddress
    },
    toggleContactDrawerOpen () {
      this.$emit('toggleContactDrawerOpen')
    }
  },
  computed: {
    chunkedMessages () {
      // TODO: Improve stacking logic e.g. long durations between messages prevent stacking
      // TODO: Optimize this by progressively constructing it
      if (!this.messages) {
        return []
      }

      const { chunks, currentChunk, globalIndex } = this.messages.slice(1).reduce(({ chunks, currentChunk, globalIndex }, message) => {
        if (currentChunk[0].senderAddress === message.senderAddress) {
          currentChunk.push(message)
          return { chunks, currentChunk, globalIndex: globalIndex }
        } else {
          chunks.push({ chunk: currentChunk, globalIndex: globalIndex })
          return { chunks, currentChunk: [message], globalIndex: globalIndex + currentChunk.length }
        }
      }, { chunks: [], currentChunk: [this.messages[0]], globalIndex: 0 })

      chunks.push({ chunk: currentChunk, globalIndex: globalIndex })
      return chunks
    },
    nameColor () {
      const color = this.getContactVuex(this.address).color
      return color
    },
    ...mapGetters({
      getContactVuex: 'contacts/getContact',
      getMessageByPayload: 'chats/getMessageByPayload',
      getProfile: 'myProfile/getProfile'
    }),
    stampAmount () {
      return Number(this.getStampAmount()(this.address))
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
      if (replyAddress === this.$wallet.myAddressStr) {
        return this.getProfile.name
      }
      const contact = this.getContactVuex(replyAddress)
      return contact.profile.name
    },
    replyColor () {
      const replyAddress = this.getMessageByPayload(this.replyDigest).senderAddress
      if (replyAddress === this.$wallet.myAddressStr) {
        return 'black'
      }
      return this.getContactVuex(this.address).color
    },
    contactProfile () {
      return this.getContactVuex(this.address).profile
    }
  },
  watch: {
    messages () {
      // Scroll to bottom if user was already there.
      if (this.bottom) {
        this.scrollBottom()
      }
    },
    active (newActive) {
      if (!newActive) {
        return
      }

      // Focus input box
      this.$refs.chatInput.focus()

      const scrollArea = this.$refs.chatScroll
      const scrollTarget = scrollArea.getScrollTarget()
      // Scroll to bottom only if the view was effectively in it's initial state.
      if (scrollTarget.scrollTop === 0) {
        this.scrollBottom()
      }
      // TODO: Scroll to last unread
    }
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  color: var(--q-color-text);
  background: var(--q-color-background);
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}

.scroll-area-bordered {
  border-right: 1px;
  border-right-style: solid;
  border-right-color: $separator-color;
  border-bottom: 1px;
  border-bottom-style: solid;
  border-bottom-color: $separator-color;
}
</style>
