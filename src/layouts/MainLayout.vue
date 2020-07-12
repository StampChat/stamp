<template>
  <q-layout view="hHr LpR lff">
    <q-drawer
      v-model="myDrawerOpen"
      overlay
      behavior="mobile"
      :width="splitterRatio"
      :breakpoint="400"
    >
      <settings-panel />
    </q-drawer>
    <q-drawer
      v-model="contactDrawerOpen"
      side="right"
      :width="300"
      :breakpoint="400"
    >
      <contact-panel
        v-if="activeChatAddr !== null"
        :address="activeChatAddr"
        :contact="getContact(activeChatAddr)"
      />
    </q-drawer>
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog :contactClick="function (address, contact) { return setActiveChat(address) }"/>
    </q-dialog>
    <q-page-container>
      <q-page :style-fn="tweak">
        <q-splitter
          v-model="splitterRatio"
          class="full-height"
          unit="px"
          emit-immediately
          :limits="[compactWidth, 1000]"
        >
          <template v-slot:before>
            <chat-list
              class="full-height"
              :loaded="loaded"
              @toggleMyDrawerOpen="toggleMyDrawerOpen"
              :compact="compact"
            />
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
              :loaded="loaded"
              @toggleContactDrawerOpen="toggleContactDrawerOpen"
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
import ContactBookDialog from '../components/dialogs/ContactBookDialog.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import { debounce } from 'quasar'

const compactWidth = 70
const compactCutoff = 325
const compactMidpoint = (compactCutoff + compactWidth) / 2

export default {
  components: {
    Chat,
    ChatList,
    ContactPanel,
    SettingsPanel,
    ContactBookDialog
  },
  data () {
    return {
      trueSplitterRatio: compactCutoff,
      loaded: false,
      myDrawerOpen: false,
      contactDrawerOpen: false,
      contactBookOpen: false,
      compact: false,
      compactWidth
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
    toggleContactDrawerOpen () {
      this.contactDrawerOpen = !this.contactDrawerOpen
    },
    toggleContactBookOpen () {
      this.contactBookOpen = !this.contactBookOpen
    },
    toggleMyDrawerOpen () {
      if (this.compact) {
        this.compact = false
        this.trueSplitterRatio = compactCutoff
      }
      this.myDrawerOpen = !this.myDrawerOpen
    },
    shortcutKeyListener (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        this.toggleContactBookOpen()
      }
    }
  },
  computed: {
    ...mapState('chats', ['chats', 'activeChatAddr']),
    ...mapGetters({
      getContact: 'contacts/getContact',
      lastReceived: 'chats/getLastReceived'
    }),
    splitterRatio: {
      get: function () {
        return this.trueSplitterRatio
      },
      set: debounce(function (inputRatio) {
        this.trueSplitterRatio = inputRatio
        this.$nextTick(() => {
          if (inputRatio < compactMidpoint) {
            this.trueSplitterRatio = compactWidth
            this.compact = true
          } else if (inputRatio > compactMidpoint && inputRatio < compactCutoff) {
            this.compact = false
            this.trueSplitterRatio = compactCutoff
          } else {
            this.compact = false
          }
        })
      }, 100)
    }
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
      this.$relayClient.refresh().then(() => {
        const t1 = performance.now()
        console.log(`Loading messages took ${t1 - t0}ms`)
        this.$wallet.init()
        console.log('loaded')
        this.loaded = true
      })
    } catch (err) {
      console.error(err)
    }
  },
  mounted () {
    document.addEventListener('keydown', this.shortcutKeyListener)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.shortcutKeyListener)
  }
}
</script>
