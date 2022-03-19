<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">
        {{ title }}
      </div>
    </q-card-section>

    <!-- message being forarded -->
    <q-card-section>
      <chat-message-reply
        :payload-digest="payloadDigest"
        :forward-message="true"
      />
    </q-card-section>

    <!-- destination contact(s) list -->
    <q-card-section>
      <q-list separator>
        <q-item>
          <q-checkbox
            label="Select all / none"
            v-model="selectAll"
            @update:model-value="selectAllContacts"
          />
        </q-item>
        <template v-for="(contact, address) in contacts" :key="address">
          <q-item v-if="!filterContact(address)">
            <q-item-section side>
              <q-checkbox
                v-model="selectedContacts"
                :toggle-indeterminate="false"
                :val="address"
              />
            </q-item-section>
            <q-item-section avatar>
              <q-avatar rounded size="55px">
                <img :src="contact.profile.avatar" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label> {{ contact.profile.name }} </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-card-section>
    <!-- actions -->
    <q-card-actions align="right">
      <q-btn flat label="Cancel" color="primary" v-close-popup />
      <q-btn
        flat
        label="Send"
        color="primary"
        v-close-popup
        :disable="selectedContacts.length === 0"
        @click="sendForward"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import ChatMessageReply from '../chat/messages/ChatMessageReply.vue'
import { mapGetters } from 'vuex'

export default {
  components: {
    ChatMessageReply,
  },
  props: {
    payloadDigest: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      selectAll: false,
      selectedContacts: [],
    }
  },
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload',
      getStampAmount: 'chats/getStampAmount',
      vuexGetActiveChat: 'chats/getActiveChat',
    }),
    filterContact(address) {
      // don't forward to original sender
      // don't forward to current sender
      // don't forward to current recipient
      switch (address) {
        case this.forwarded?.address:
        case this.message.senderAddress:
        case this.vuexGetActiveChat():
          return true
      }
      return false
    },
    selectAllContacts(checked) {
      this.selectedContacts = []
      if (checked) {
        Object.keys(this.contacts).map(address =>
          this.selectedContacts.push(address),
        )
      }
    },
    sendForward() {
      this.$q.loading.show({ message: 'Forwarding message...' })
      this.selectedContacts.forEach(async address => {
        const from = this.forwarded?.from || this.from
        const fromAddress =
          this.forwarded?.address || this.message.senderAddress
        const content = this.forwarded?.content || this.content
        const stampAmount = this.getStampAmount()(address)
        await this.$relayClient.forwardMessage({
          address,
          from,
          fromAddress,
          content,
          stampAmount,
        })
      })
      this.$q.loading.hide()
    },
  },
  computed: {
    ...mapGetters({
      contacts: 'contacts/getContacts',
      myProfile: 'myProfile/getProfile',
    }),
    message() {
      const message = this.getMessageByPayloadVuex()(this.payloadDigest)
      return message || { items: [], senderAddress: undefined }
    },
    // used if we are forwarding an already-forwarded message
    forwarded() {
      return this.message.items.find(item => item.type === 'forward')
    },
    content() {
      // remove replyDigest from the content
      return this.message.items.filter(item => item.type !== 'reply')
    },
    from() {
      const senderAddress = this.message.senderAddress
      return senderAddress !== this.$wallet.myAddress.toXAddress()
        ? this.contacts[senderAddress].profile.name
        : this.myProfile.name
    },
  },
}
</script>

<style lang="scss" scoped>
:deep(.message-color) {
  background-color: var(--q-message-color);
}
:deep(.message-color-sent) {
  background-color: var(--q-message-color-sent);
}
</style>
