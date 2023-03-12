<template>
  <div class="full-width column col">
    <contact-card
      :address="getMyAddressStr"
      :name="profile.name"
      :bio="profile.bio"
      :avatar="profile.avatar"
      :acceptance-price="inbox.acceptancePrice"
    />

    <!-- Contact book dialog -->
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog
        :contact-click="
          function (address, contact) {
            return setActiveChat(address)
          }
        "
        @close-contact-search-dialog="closeContactSearchDialog"
      />
    </q-dialog>

    <!-- Seed phrase dialog -->
    <q-dialog v-model="seedPhraseOpen">
      <seed-phrase-dialog />
    </q-dialog>

    <div class="flex-break" />
    <!-- Drawer -->
    <q-scroll-area class="col">
      <q-list>
        <q-item clickable v-ripple @click="newContact">
          <q-item-section avatar>
            <q-icon name="add_comment" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.newContact') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="contactBookOpen = true">
          <q-item-section avatar>
            <q-icon name="contacts" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.contacts') }}</q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-ripple @click="sendECash">
          <q-item-section avatar>
            <q-icon name="send" />
          </q-item-section>

          <q-item-section>
            {{ $t('SettingPanel.sendBitcoinCash') }}
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="receiveECash">
          <q-item-section avatar>
            <q-icon name="account_balance_wallet" />
          </q-item-section>

          <q-item-section>
            {{ $t('SettingPanel.recieveBitcoinCash') }}
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item clickable v-ripple @click="openProfile">
          <q-item-section avatar>
            <q-icon name="face" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.profile') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="openSettings">
          <q-item-section avatar>
            <q-icon name="tune" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.settings') }}</q-item-section>
        </q-item>
        <q-separator />

        <q-item clickable v-ripple @click="deleteForever">
          <q-item-section avatar>
            <q-icon name="delete_forever" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.wipeAndSave') }}</q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="
            $router.push('/changelog').catch(() => {
              // Don't care. Probably duplicate route
            })
          "
        >
          <q-item-section avatar>
            <q-icon name="change_history" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.changeLog') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="seedPhraseOpen = true">
          <q-item-section avatar>
            <q-icon name="compost" />
          </q-item-section>
          <q-item-section>{{ $t('SettingPanel.showSeed') }}</q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

import SeedPhraseDialog from '../dialogs/SeedPhraseDialog.vue'
import ContactCard from './ContactCard.vue'
import ContactBookDialog from '../dialogs/ContactBookDialog.vue'
import { openChat, openPage } from '../../utils/routes'
import { useChatStore } from 'src/stores/chats'
import { useProfileStore } from 'src/stores/my-profile'
import { storeToRefs } from 'pinia'

export default defineComponent({
  setup() {
    const chats = useChatStore()
    const myProfile = useProfileStore()
    const { profile, inbox } = storeToRefs(myProfile)
    const seedPhraseOpen = ref(false)
    return {
      deleteMessage: chats.deleteMessage,
      profile,
      inbox,
      seedPhraseOpen,
    }
  },
  components: {
    ContactCard,
    ContactBookDialog,
    SeedPhraseDialog,
  },
  data() {
    return {
      contactBookOpen: false,
    }
  },
  emits: ['update:drawerOpen'],
  props: {
    drawerOpen: {
      type: Boolean,
      default: () => false,
    },
  },
  model: {
    prop: 'drawerOpen',
    event: 'update:drawerOpen',
  },
  methods: {
    getIdentityPrivKey() {
      return this.$wallet.identityPrivKey
    },
    closeContactSearchDialog() {
      this.contactBookOpen = false
    },
    openSettings() {
      openPage(this.$router, '/settings')
    },
    openProfile() {
      openPage(this.$router, '/profile')
    },
    receiveECash() {
      openPage(this.$router, '/receive')
    },
    sendECash() {
      openPage(this.$router, '/send')
    },
    newContact() {
      openPage(this.$router, '/add-contact')
    },
    deleteForever() {
      openPage(this.$router, '/wipe-wallet')
    },
    setActiveChat(address: string) {
      openChat(this.$router, address)
    },
  },
  computed: {
    getMyAddressStr() {
      return this.$wallet.myAddress?.toXAddress()
    },
    drawerOpenModel: {
      get() {
        return this.drawerOpen
      },
      set(value: boolean) {
        this.$emit('update:drawerOpen', value)
      },
    },
  },
})
</script>
