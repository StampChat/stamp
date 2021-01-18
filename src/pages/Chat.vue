<template>
  <div class="col full-height">
    <chat
      v-for="(item, index) in chats"
      v-show="activeChatAddr === index"
      :key="index"
      :address="index"
      :messages="item.messages"
      :active="activeChatAddr === index"
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
    this.activeChatAddr = to.params.address
    next()
  },
  data () {
    return {
      activeChatAddr: this.$route.params.address
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
    ...mapState('chats', ['chats'])
  }
}
</script>
