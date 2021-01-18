<template>
  <div class="full-width column col">
    <contact-card
      :address="getMyAddressStr"
      :name="getProfile.name"
      :bio="getProfile.bio"
      :avatar="getProfile.avatar"
      :acceptance-price="getInbox.acceptancePrice"
    />

    <!-- Contact book dialog -->
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog
        :contact-click="function (address, contact) { return setActiveChat(address) }"
        @close-contact-search-dialog="closeContactSearchDialog"
      />
    </q-dialog>

    <div class="flex-break" />
    <!-- Drawer -->
    <q-scroll-area class="col">
      <q-list>
        <q-item
          clickable
          v-ripple
          @click="newContact"
        >
          <q-item-section avatar>
            <q-icon name="add_comment" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.newContact') }}</q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="contactBookOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="contacts" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.contacts') }}</q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="sendECash"
        >
          <q-item-section avatar>
            <q-icon name="send" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.sendBitcoinCash') }}</q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="receiveECash"
        >
          <q-item-section avatar>
            <q-icon name="account_balance_wallet" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.recieveBitcoinCash') }}</q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="openProfile"
        >
          <q-item-section avatar>
            <q-icon name="face" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.profile') }}</q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="openSettings"
        >
          <q-item-section avatar>
            <q-icon name="tune" />
          </q-item-section>

          <q-item-section>{{ $t('SettingPanel.settings') }}</q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import ContactCard from './ContactCard.vue'
import ContactBookDialog from '../dialogs/ContactBookDialog.vue'

const openPage = (router, currentRoute, route) => {
  if (currentRoute.startsWith('/chat/')) {
    return router.push(route)
  }
  return router.replace(route)
}

export default {
  components: {
    ContactCard,
    ContactBookDialog
  },
  data () {
    return {
      contactBookOpen: false
    }
  },
  props: {
    drawerOpen: {
      type: Boolean,
      default: () => false
    }
  },
  model: {
    prop: 'drawerOpen',
    event: 'update:drawerOpen'
  },
  methods: {
    ...mapActions({
      setActiveChat: 'chats/setActiveChat'
    }),
    getIdentityPrivKey () {
      return this.$wallet.identityPrivKey
    },
    closeContactSearchDialog () {
      this.contactBookOpen = false
    },
    openSettings () {
      openPage(this.$router, this.$route.path, '/settings')
    },
    openProfile () {
      openPage(this.$router, this.$route.path, '/profile')
    },
    receiveECash () {
      openPage(this.$router, this.$route.path, '/receive')
    },
    sendECash () {
      openPage(this.$router, this.$route.path, '/send')
    },
    newContact () {
      openPage(this.$router, this.$route.path, '/add-contact')
    }
  },
  computed: {
    ...mapGetters({
      getProfile: 'myProfile/getProfile',
      getInbox: 'myProfile/getInbox'
    }),
    getMyAddressStr () {
      return this.$wallet.myAddressStr
    },
    drawerOpenModel: {
      get () {
        return this.drawerOpen
      },
      set (value) {
        this.$emit('update:drawerOpen', value)
      }
    }
  }
}
</script>
