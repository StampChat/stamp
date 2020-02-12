<template>
  <q-drawer
    v-model="drawerOpen"
    show-if-above
    overlay
    elevated
    behavior="mobile"
    :width="200"
    :breakpoint="400"
  >
    <drawer-contact-card
      :address="getMyAddressStr"
      :name="getMyProfile.name"
      :bio="getMyProfile.bio"
      :avatar="getMyProfile.avatar"
      :acceptancePrice="getMyProfile.acceptancePrice"
    />

    <!-- New contact dialog -->
    <q-dialog v-model="newContactOpen">
      <new-contact-dialog />
    </q-dialog>

    <!-- Set filter dialog -->
    <q-dialog v-model="setFilterOpen">
      <set-filter-dialog :oldPrice="getMyProfile.acceptancePrice" />
    </q-dialog>

    <!-- Contact book dialog -->
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog :contactClick="function (addr, contact) { return openChat(addr) }" />
    </q-dialog>

    <!-- Contact book dialog -->
    <q-dialog v-model="sendAddressOpen">
      <send-address-dialog />
    </q-dialog>

    <!-- Wallet dialog -->
    <q-dialog v-model="walletOpen">
      <wallet-dialog />
    </q-dialog>

    <!-- Profile dialog -->
    <q-dialog v-model="profileOpen">
      <profile-dialog :currentProfile="getMyProfile" />
    </q-dialog>

    <!-- Drawer -->
    <q-scroll-area style="height: calc(100% - 125px); margin-top: 125px; border-right: 1px solid #ddd">
      <q-list padding>
        <q-item
          clickable
          v-ripple
          @click="newContactOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="add_comment" />
          </q-item-section>

          <q-item-section>
            New Contact
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="contactBookOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="contacts" />
          </q-item-section>

          <q-item-section>
            Contacts
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="sendAddressOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="send" />
          </q-item-section>

          <q-item-section>
            Send to Address
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="walletOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="account_balance_wallet" />
          </q-item-section>

          <q-item-section>
            Wallet
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="setFilterOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="filter_list" />
          </q-item-section>

          <q-item-section>
            Set Filter
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="profileOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="face" />
          </q-item-section>

          <q-item-section>
            Profile
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="tune" />
          </q-item-section>

          <q-item-section>
            Settings
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

  </q-drawer>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import DrawerContactCard from './DrawerContactCard.vue'
import NewContactDialog from '../dialogs/NewContactDialog.vue'
import SetFilterDialog from '../dialogs/SetFilterDialog.vue'
import ContactBookDialog from '../dialogs/ContactBookDialog.vue'
import WalletDialog from '../dialogs/WalletDialog.vue'
import ProfileDialog from '../dialogs/ProfileDialog.vue'
import SendAddressDialog from '../dialogs/SendAddressDialog.vue'

export default {
  components: {
    DrawerContactCard,
    NewContactDialog,
    SetFilterDialog,
    ContactBookDialog,
    WalletDialog,
    ProfileDialog,
    SendAddressDialog
  },
  data () {
    return {
      newContactOpen: false,
      setFilterOpen: false,
      sendAddressOpen: false,
      contactBookOpen: false,
      walletOpen: false,
      profileOpen: false
    }
  },
  methods: {
    ...mapActions({
      setDrawerOpen: 'myDrawer/setDrawerOpen',
      addNewContact: 'contacts/addNewContact',
      openChat: 'chats/openChat'
    }),
    ...mapGetters({
      getIdentityPrivKey: 'wallet/getIdentityPrivKey',
      getMyAddress: 'wallet/getMyAddress'
    })
  },
  computed: {
    ...mapGetters({
      getDrawerOpen: 'myDrawer/getDrawerOpen',
      getMyProfile: 'myProfile/getMyProfile',
      getMyAddressStr: 'wallet/getMyAddressStr'
    }),
    drawerOpen: {
      get () {
        return this.getDrawerOpen
      },
      set (value) {
        this.setDrawerOpen(value)
      }
    }
  }
}
</script>
