<template>
  <q-layout view="hHr LpR lff">
    <q-btn
      v-show="false"
      @click="promptNotificationPermission"
      ref="buttonNotification"
    />
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

<script lang="ts">
import assert from 'assert'

import { defineComponent, ref, watch } from 'vue'
import { QBtn } from 'quasar'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import LeftDrawer from '../components/panels/LeftDrawer.vue'
import ContactBookDialog from '../components/dialogs/ContactBookDialog.vue'
import { defaultContacts, keyservers, networkName } from '../utils/constants'
import { KeyserverHandler } from '../cashweb/keyserver'
import { errorNotify } from '../utils/notifications'
import { useRelayClientStore } from 'src/stores/relay-client'
import { useAppearanceStore } from 'src/stores/appearance'
import { useProfileStore } from 'src/stores/my-profile'
import { useContactStore } from 'src/stores/contacts'
import { useChatStore } from 'src/stores/chats'

const compactWidth = 70
const compactCutoff = 325
const compactMidpoint = (compactCutoff + compactWidth) / 2

export default defineComponent({
  components: {
    LeftDrawer,
    ContactBookDialog,
  },
  setup() {
    const chatStore = useChatStore()
    const relayClient = useRelayClientStore()
    const contacts = useContactStore()
    const appearanceStore = useAppearanceStore()
    const { darkMode } = storeToRefs(appearanceStore)
    const myProfile = useProfileStore()

    const {
      getLastReceived: lastReceived,
      totalUnread,
      getSortedChatOrder,
      activeChatAddr,
    } = storeToRefs(chatStore)

    const router = useRouter()

    watch(activeChatAddr, newAddress => {
      // Only route to chat if address defined
      // e.g. do *not* route when navigating to Forum
      if (!newAddress) {
        return
      }
      router.push(`/chat/${newAddress}`).catch(() => {
        // Don't care. Probably duplicate route
      })
    })

    return {
      setActiveChat: chatStore.setActiveChat,
      addDefaultContact: contacts.addDefaultContact,
      refreshContacts: contacts.refreshContacts,
      // FIXME: Some kind of race condition here where if this is computed,
      // it won't be set yet by the time the setupConnections function is called
      // after signing up or logging in.
      relayToken: () => relayClient.token,
      getSortedChatOrder,
      darkMode,
      lastReceived,
      totalUnread,
      getRelayData: myProfile,
      buttonNotification: ref<QBtn | null>(null),
    }
  },
  data() {
    return {
      trueSplitterRatio: compactCutoff,
      myDrawerOpen: !!this.activeChatAddr as boolean,
      contactDrawerOpen: false as boolean,
      contactBookOpen: false,
      compact: false,
      compactWidth,
      notificationPermission:
        typeof Notification !== 'undefined' ? Notification.permission : null,
    }
  },
  methods: {
    tweak(offset: number, viewportHeight: number) {
      const height = viewportHeight - offset + 'px'
      return { height, minHeight: height }
    },
    toggleContactDrawerOpen() {
      console.log('toggleContactDrawerOpen')
      this.contactDrawerOpen = !this.contactDrawerOpen
    },
    toggleContactBookOpen() {
      console.log('toggleContactBookOpen')
      this.contactBookOpen = !this.contactBookOpen
    },
    toggleMyDrawerOpen() {
      if (this.compact) {
        this.compact = false
        this.trueSplitterRatio = compactCutoff
      }
      this.myDrawerOpen = !this.myDrawerOpen
    },
    promptNotificationPermission() {
      if (typeof Notification === 'undefined') {
        return
      }
      try {
        Notification.requestPermission().then(
          () => (this.notificationPermission = Notification.permission),
        )
      } catch (error) {
        // Safari doesn't return a promise for requestPermissions and it
        // throws a TypeError. It takes a callback as the first argument
        // instead.
        if (error instanceof TypeError) {
          Notification.requestPermission(() => {
            this.notificationPermission = Notification.permission
          })
        } else {
          throw error
        }
      }
    },
    shortcutKeyListener(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        this.toggleContactBookOpen()
      }
    },
    contactClicked(newAddress: string) {
      this.setActiveChat(newAddress)
    },
    setupConnections() {
      // Not currently setup. User needs to go through setup flow first
      if (!this.relayToken()) {
        return
      }
      this.$status.setup = true

      console.log('Loading')
      // Setup everything at once. This are independent processes
      try {
        if (this.$wallet.myAddress) {
          this.$relayClient.setUpWebsocket(this.$wallet.myAddress)
        } else {
          console.error(
            'this.$wallet.myAddress not setup yet in MainLayout.vue',
          )
        }
      } catch (err) {
        console.error(err)
      }

      // Add default contacts
      for (const defaultContact of defaultContacts) {
        this.addDefaultContact(defaultContact)
      }
      this.$nextTick(() =>
        this.refreshContacts().catch(err => console.error(err)),
      )

      // const lastReceived = this.lastReceived
      const t0 = performance.now()
      const refreshMessages = () => {
        this.$q.loading.show({ message: 'Loading messages' })
        // Wait for a connected blockchain client
        if (!this.$indexer.connected) {
          setTimeout(refreshMessages, 100)
          return
        }
        this.$relayClient
          .refresh()
          .then(() => {
            const t1 = performance.now()
            console.log(`Loading messages took ${t1 - t0}ms`)
            this.$status.loaded = true
            this.$q.loading.hide()
          })
          .catch(err => {
            console.error(err)
            setTimeout(refreshMessages, 100)
          })
      }
      refreshMessages()

      const handler = new KeyserverHandler({
        wallet: this.$wallet,
        keyservers: keyservers,
        networkName,
      })
      assert(this.$wallet.myAddress, 'Address not yet defined?')

      // Update keyserver data if it doesn't exist.
      handler.getRelayUrl(this.$wallet.myAddress?.toXAddress()).catch(() => {
        if (!this.$wallet.identityPrivKey) {
          return
        }
        handler.updateKeyMetadata(
          this.$relayClient.url,
          this.$wallet.identityPrivKey,
        )
      })

      // Update profile if it doesn't exist.
      this.$relayClient.getRelayData(this.$wallet.myAddress).catch(() => {
        if (!this.$wallet.identityPrivKey) {
          return
        }
        const relayData = this.getRelayData

        this.$relayClient
          .updateProfile(
            this.$wallet.identityPrivKey,
            relayData.profile,
            relayData.inbox.acceptancePrice,
          )
          .catch(err => {
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
    },
  },
  computed: {
    splitterRatio: {
      get(): number {
        return this.trueSplitterRatio
      },
      set(inputRatio: number): void {
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
      },
    },
  },
  created() {
    this.$q.dark.set(this.darkMode)
    this.setupConnections()
  },
  mounted() {
    document.addEventListener('keydown', this.shortcutKeyListener)
  },
  updated() {
    // Ask browser for notification permissions after any DOM update
    switch (this.notificationPermission) {
      case 'denied':
      case 'granted':
        break
      default:
        this.buttonNotification?.click()
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.shortcutKeyListener)
  },
})
</script>
