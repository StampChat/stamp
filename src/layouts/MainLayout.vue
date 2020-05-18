<template>
  <q-layout view="hHr LpR lff">
    <q-drawer
      v-model="myDrawerOpen"
      v-if="loaded"
      overlay
      bordered
      behavior="mobile"
      :width="splitterRatio"
      :breakpoint="400"
    >
      <settings-panel />
    </q-drawer>
    <q-drawer v-model="contactDrawerOpen" v-if="loaded" side="right" :width="300" :breakpoint="400" bordered>
      <contact-panel
        v-if="activeChatAddr !== null"
        :address="activeChatAddr"
        :contact="getContact(activeChatAddr)"
      />
    </q-drawer>
    <q-page-container>
      <q-page :style-fn="tweak" v-if="loaded">
        <q-splitter
          v-model="splitterRatio"
          class="full-height"
          unit="px"
        >
          <template v-slot:before>
            <chat-list class="full-height" @toggleContactDrawerOpen="toggleContactDrawerOpen" @toggleMyDrawerOpen="toggleMyDrawerOpen" />
          </template>

          <template v-slot:after>
            <chat
              v-for="(item, index) in chats"
              v-show="activeChatAddr === index"
              :key="index"
              :address="index"
              :messages="item.messages"
              :active="activeChatAddr === index"
              :style="`height: inherit; min-height: inherit;`"
            />
          </template>
        </q-splitter>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import Chat from '../pages/Chat.vue'
import ChatList from '../components/chat/ChatList.vue'
import SettingsPanel from '../components/panels/SettingsPanel.vue'
import ContactPanel from '../components/panels/ContactPanel.vue'
import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  components: {
    Chat,
    ChatList,
    ContactPanel,
    SettingsPanel
  },
  data () {
    return {
      splitterRatio: 200,
      loaded: false,
      myDrawerOpen: false,
      contactDrawerOpen: false
    }
  },
  methods: {
    ...mapActions({
      setActiveChat: 'chats/setActiveChat'
    }),
    ...mapGetters({
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getDarkMode: 'appearance/getDarkMode'
    }),
    tweak (offset, viewportHeight) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    setSplitRatio (value) {
      this.splitterRatio = value
    },
    toggleContactDrawerOpen () {
      this.contactDrawerOpen = !this.contactDrawerOpen
    },
    toggleMyDrawerOpen () {
      this.myDrawerOpen = !this.myDrawerOpen
    }
  },
  computed: {
    ...mapState('chats', ['chats', 'activeChatAddr']),
    ...mapGetters({
      getContact: 'contacts/getContact',
      lastReceived: 'chats/getLastReceived'
    })
  },
  created () {
    this.$q.dark.set(this.getDarkMode())

    console.log('loading')

    if (!this.activeChatAddr) {
      const contacts = this.getSortedChatOrder()
      if (contacts.length) {
        this.setActiveChat(contacts[0].address)
      }
    }

    // Setup everything at once. This are independent processes
    try {
      this.$relayClient.setUpWebsocket(this.$wallet.myAddressStr)
      // const lastReceived = this.lastReceived
      const t0 = performance.now()
      this.$relayClient.refresh({ lastReceived: null }).then(() => {
        const t1 = performance.now()
        console.log(`Loading messages took ${t1 - t0}ms`)
        this.$wallet.init()
        console.log('loaded')
      })
    } catch (err) {
      console.error(err)
    }

    this.loaded = true
  }
}
</script>
