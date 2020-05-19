<template>
  <div class="reply">
    <div class='col text-weight-bold' :style="`color: ${nameColor};`"> {{ name }} </div>
    <chat-message
      class="row-auto"
      :message="message"
      :address="address"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'chat-message-reply',
  components: {
    ChatMessage: () => import('./ChatMessage.vue')
  },
  props: {
    address: {
      type: String,
      required: true
    },
    payloadDigest: {
      type: String,
      required: true
    }
  },
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload',
      getContact: 'contacts/getContact'
    })
  },
  computed: {
    ...mapGetters({
      getProfile: 'myProfile/getProfile'
    }),
    message () {
      const message = this.getMessageByPayloadVuex()(this.payloadDigest)
      return message || { items: [] }
    },
    name () {
      if (this.message.senderAddress === this.$wallet.myAddressStr) {
        return this.getProfile.name
      }
      const contact = this.getContact()(this.message.senderAddress)
      return contact.profile.name
    },
    nameColor () {
      if (this.message.senderAddress === this.$wallet.myAddressStr) {
        return 'black'
      }
      return this.getContact()(this.address).color
    }
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  background: #FFF;
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}
</style>
