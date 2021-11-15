<template>
  <q-layout view="hHr LpR lff">
    <q-header class="electron-only">
      <q-bar
        style="height: 23px"
        class="q-electron-drag q-pr-xs"
      >
        <q-space />
        <q-btn
          dense
          size="xs"
          flat
          icon="minimize"
          @click="minimize"
        />
        <q-btn
          dense
          size="xs"
          flat
          icon="crop_square"
          @click="toggleMaximize"
        />
        <q-btn
          dense
          size="xs"
          flat
          icon="close"
          @click="closeApp"
        />
      </q-bar>
    </q-header>

    <q-drawer
      v-model="myDrawerOpen"
      :width="splitterRatio"
      :breakpoint="800"
      show-if-above
    >
      <left-drawer />
    </q-drawer>
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog :contact-click="contactClicked" />
    </q-dialog>
    <q-page-container>
      <q-page :style-fn="tweak">
        <router-view
          @toggleContactDrawerOpen="toggleContactDrawerOpen"
          @toggleMyDrawerOpen="toggleMyDrawerOpen"
          @setupCompleted="setupConnections"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import LeftDrawer from '../components/panels/LeftDrawer.vue'
import ContactBookDialog from '../components/dialogs/ContactBookDialog.vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import { debounce } from 'quasar'
import { defaultContacts, keyservers, networkName } from '../utils/constants'
import { KeyserverHandler } from '../cashweb/keyserver/handler'
import { errorNotify } from '../utils/notifications'

const compactWidth = 70
const compactCutoff = 325
const compactMidpoint = (compactCutoff + compactWidth) / 2

export default {
  components: {
    LeftDrawer,
    ContactBookDialog
  },
  data () {
    return {
      trueSplitterRatio: compactCutoff,
      myDrawerOpen: !!this.activeChatAddr,
      contactBookOpen: false,
      compact: false,
      compactWidth
    }
  },
  methods: {
    ...mapActions({
      vuexSetActiveChat: 'chats/setActiveChat',
      addDefaultContact: 'contacts/addDefaultContact',
      refreshContacts: 'contacts/refreshContacts'
    }),
    ...mapGetters({
      getRelayToken: 'relayClient/getToken',
      getSortedChatOrder: 'chats/getSortedChatOrder',
      getDarkMode: 'appearance/getDarkMode'
    }),
    minimize () {
      if (process.env.MODE === 'electron') {
        window.myWindowAPI.minimize()
      }
    },
    toggleMaximize () {
      if (process.env.MODE === 'electron') {
        window.myWindowAPI.toggleMaximize()
      }
    },
    closeApp () {
      if (process.env.MODE === 'electron') {
        window.myWindowAPI.close()
      }
    },
    tweak (offset, viewportHeight) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    toggleContactDrawerOpen () {
      console.log('toggleContactDrawerOpen')
      this.contactDrawerOpen = !this.contactDrawerOpen
    },
    toggleContactBookOpen () {
      console.log('toggleContactBookOpen')
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
    },
    contactClicked (newAddress) {
      this.vuexSetActiveChat(newAddress)
      this.$router.push(`/chat/${newAddress}`).catch(() => {
        // Don't care. Probably duplicate route
      })
    },
    setupConnections () {
      // Not currently setup. User needs to go through setup flow first
      if (!this.getRelayToken()) {
        return
      }
      this.$status.setup = true

      console.log('Loading')
      // Setup everything at once. This are independent processes
      try {
        this.$relayClient.setUpWebsocket(this.$wallet.myAddress)
      } catch (err) {
        console.error(err)
      }

      // Add default contacts
      for (const defaultContact of defaultContacts) {
        this.addDefaultContact(defaultContact)
      }
      this.$nextTick(this.refreshContacts)

      // const lastReceived = this.lastReceived
      const t0 = performance.now()
      const refreshMessages = () => {
        // Wait for a connected electrum client
        if (!this.$electrum.connected) {
          setTimeout(refreshMessages, 100)
          return
        }
        this.$relayClient
          .refresh()
          .then(() => {
            const t1 = performance.now()
            console.log(`Loading messages took ${t1 - t0}ms`)
            this.$status.loaded = true
          })
          .catch((err) => {
            console.error(err)
            setTimeout(refreshMessages, 100)
          })
      }
      refreshMessages()

      const handler = new KeyserverHandler({ wallet: this.$wallet, keyservers: keyservers, networkName })
      // Update keyserver data if it doesn't exist.
      handler.getRelayUrl(this.$wallet.myAddress.toXAddress()).catch(() => {
        handler.updateKeyMetadata(
          this.$relayClient.url,
          this.$wallet.identityPrivKey
        )
      })

      // Update profile if it doesn't exist.
      this.$relayClient.getRelayData(this.$wallet.myAddress).catch(() => {
        const relayData = this.getRelayData()
        this.$relayClient
          .updateProfile(
            this.$wallet.identityPrivKey,
            relayData.profile,
            relayData.inbox.acceptancePrice
          )
          .catch((err) => {
            console.error(err)
            // TODO: Move specialization down error displayer
            if (err.response.status === 413) {
              errorNotify(new Error(this.$t('profileDialog.avatarTooLarge')))
              this.$q.loading.hide()
              throw err
            }
            errorNotify(new Error(this.$t('profileDialog.unableContactRelay')))
            throw err
          })
      })
      this.$q.loading.hide()
    }
  },
  computed: {
    ...mapState('chats', ['chats', 'activeChatAddr']),
    ...mapGetters({
      lastReceived: 'chats/getLastReceived',
      totalUnread: 'chats/totalUnread',
      getRelayData: 'myProfile/getRelayData'
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
          } else if (
            inputRatio > compactMidpoint &&
            inputRatio < compactCutoff
          ) {
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
    this.setupConnections()
  },
  mounted () {
    document.addEventListener('keydown', this.shortcutKeyListener)
  },
  beforeUnmount () {
    document.removeEventListener('keydown', this.shortcutKeyListener)
  },
  watch: {
    totalUnread: function (unread) {
      this.updateBadge(unread)
    }
  }
}
</script>
