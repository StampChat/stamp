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
    <!-- New contact dialog -->
    <q-dialog v-model="newContactOpen">
      <new-contact-dialog />
    </q-dialog>

    <!-- Set filter dialog -->
    <q-dialog v-model="setFilterOpen">
      <set-filter-dialog :oldPrice="getMyProfile.acceptancePrice" />
    </q-dialog>

    <!-- Drawer -->
    <q-scroll-area style="height: calc(100% - 150px); margin-top: 150px; border-right: 1px solid #ddd">
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
        >
          <q-item-section avatar>
            <q-icon name="contacts" />
          </q-item-section>

          <q-item-section>
            Contacts
          </q-item-section>
        </q-item>
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
    <profile-card
      :address="getMyAddressStr"
      :name="getMyProfile.name"
      :bio="getMyProfile.bio"
      :avatar="getMyProfile.avatar"
      :acceptancePrice="getMyProfile.acceptancePrice"
    />
  </q-drawer>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ProfileCard from './ProfileCard.vue'
import NewContactDialog from './dialogs/NewContactDialog.vue'
import SetFilterDialog from './dialogs/SetFilterDialog.vue'

export default {
  components: {
    ProfileCard,
    NewContactDialog,
    SetFilterDialog
  },
  data () {
    return {
      newContactOpen: false,
      setFilterOpen: false
    }
  },
  methods: {
    ...mapActions({
      setDrawerOpen: 'myDrawer/setDrawerOpen',
      addNewContact: 'contacts/addNewContact'
    }),
    ...mapGetters({
      getIdentityPrivKey: 'wallet/getIdentityPrivKey',
      getMyAddress: 'wallet/getMyAddress',
      getRelayToken: 'relayClient/getToken',
      getRelayClient: 'relayClient/getClient'
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
