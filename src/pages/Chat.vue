<template>
  <div class="col full-height">
    <chat
      :key="address"
      :address="address"
      :messages="messages"
      :style="`height: inherit; min-height: inherit;`"
      v-on="$listeners"
    />
  </div>
</template>

<script>
import Chat from '../layouts/Chat.vue'
import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  components: {
    Chat
  },
  beforeRouteUpdate (to, from, next) {
    this.address = to.params.address
    next()
  },
  data () {
    return {
      address: this.$route.params.address
    }
  },
  methods: {
    ...mapActions({
      setActiveChat: 'chats/setActiveChat',
      addDefaultContact: 'contacts/addDefaultContact'
    }),
    ...mapGetters({
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getDarkMode: 'appearance/getDarkMode'
    })
  },
  computed: {
    ...mapState('chats', ['chats']),
    messages () {
      const activeChat = this.chats[this.address]
      return activeChat ? activeChat.messages : []
    }
  }
}
</script>
