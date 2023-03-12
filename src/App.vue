<template>
  <q-btn
    v-show="false"
    @click="promptNotificationPermission"
    ref="buttonNotification"
  />
  <q-dialog v-model="contactBookOpen">
    <contact-book-dialog :contact-click="contactClicked" />
  </q-dialog>

  <router-view @setupCompleted="setupConnections" />
</template>

<script lang="ts">
import assert from 'assert'

import { defineComponent, ref, watch } from 'vue'
import { QBtn } from 'quasar'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { defaultContacts, registrys, networkName } from 'src/utils/constants'
import { RegistryHandler } from 'src/cashweb/registry'
import { errorNotify } from 'src/utils/notifications'
import { useRelayClientStore } from 'src/stores/relay-client'
import { useAppearanceStore } from 'src/stores/appearance'
import { useProfileStore } from 'src/stores/my-profile'
import { useContactStore } from 'src/stores/contacts'
import { useChatStore } from 'src/stores/chats'
import { openChat } from 'src/utils/routes'

import ContactBookDialog from 'src/components/dialogs/ContactBookDialog.vue'
import { useWallet } from './utils/clients'

export default defineComponent({
  components: {
    ContactBookDialog,
  },
  setup() {
    // Setup chats, contacts, etc.
    const chatStore = useChatStore()
    const relayClient = useRelayClientStore()
    const contacts = useContactStore()
    const appearanceStore = useAppearanceStore()
    const { darkMode } = storeToRefs(appearanceStore)
    const myProfile = useProfileStore()

    const {
      getLastReceived: lastReceived,
      totalUnread,
      activeChatAddr,
    } = storeToRefs(chatStore)

    const router = useRouter()

    watch(activeChatAddr, newAddress => {
      // Only route to chat if address defined
      // e.g. do *not* route when navigating to Forum
      if (!newAddress) {
        return
      }
      openChat(router, newAddress)
    })

    const contactClicked = (newAddress: string) => {
      openChat(router, newAddress)
    }
    const contactBookOpen = ref(false)

    return {
      addDefaultContact: contacts.addDefaultContact,
      refreshContacts: contacts.refreshContacts,
      // FIXME: Some kind of race condition here where if this is computed,
      // it won't be set yet by the time the setupConnections function is called
      // after signing up or logging in.
      relayToken: () => relayClient.token,
      contactClicked,
      darkMode,
      lastReceived,
      totalUnread,
      getRelayData: myProfile,
      buttonNotification: ref<QBtn | null>(null),
      shortcutKeyListener(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          contactBookOpen.value = !contactBookOpen.value
        }
      },
      contactBookOpen,
    }
  },
  data() {
    return {
      notificationPermission:
        typeof Notification !== 'undefined' ? Notification.permission : null,
    }
  },
  methods: {
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
    setupConnections() {
      // Not currently setup. User needs to go through setup flow first
      if (!this.relayToken()) {
        return
      }
      this.$status.setup = true
      const wallet = useWallet()

      console.log('Loading')
      // Setup everything at once. This are independent processes
      try {
        if (wallet.myAddress) {
          this.$relayClient.setUpWebsocket(wallet.myAddress)
        } else {
          console.error('wallet.myAddress not setup yet in MainLayout.vue')
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

      const handler = new RegistryHandler({
        wallet: wallet,
        registrys: registrys,
        networkName,
      })
      assert(wallet.myAddress, 'Address not yet defined?')

      // Update registry data if it doesn't exist.
      handler.getRelayUrl(wallet.myAddress?.toXAddress()).catch(() => {
        if (!wallet.identityPrivKey) {
          return
        }
        handler.updateKeyMetadata(this.$relayClient.url, wallet.identityPrivKey)
      })

      // Update profile if it doesn't exist.
      this.$relayClient.getRelayData(wallet.myAddress).catch(() => {
        if (!wallet.identityPrivKey) {
          return
        }
        const relayData = this.getRelayData

        this.$relayClient
          .updateProfile(
            wallet.identityPrivKey,
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
  created() {
    this.$q.dark.set(this.darkMode)
    this.setupConnections()
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
  mounted() {
    document.addEventListener('keydown', this.shortcutKeyListener)
  },
})
</script>
