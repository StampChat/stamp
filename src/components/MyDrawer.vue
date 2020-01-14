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
    <!-- Dialogs -->
    <q-dialog v-model="newContactOpen">
      <new-contact-dialog :active="newContactOpen" />
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
          @click="setFilter"
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
import RelayClient from '../relay/client.js'
import NewContactDialog from './dialogs/NewContactDialog.vue'
import relayConstructors from '../relay/constructors'

export default {
  components: {
    ProfileCard,
    NewContactDialog
  },
  data () {
    return {
      newContactOpen: false
    }
  },
  methods: {
    ...mapActions({
      setDrawerOpen: 'myDrawer/setDrawerOpen',
      addNewContact: 'contacts/addNewContact',
      setAcceptancePrice: 'myProfile/setAcceptancePrice'
    }),
    ...mapGetters({
      getIdentityPrivKey: 'wallet/getIdentityPrivKey',
      getMyAddress: 'wallet/getMyAddress',
      getRelayToken: 'relayClient/getToken'
    }),
    setFilter () {
      this.$q.dialog({
        title: 'Set Price Filter',
        message: 'Set the required price for inbox admission (satoshis)',
        prompt: {
          model: '',
          type: 'number'
        },
        cancel: true,
        persistent: true
      }).onOk(async acceptancePrice => {
        // Get identity address
        let idAddress = this.getMyAddress()

        // TODO: Make variable
        let client = new RelayClient('http://34.67.137.105:8080')

        // Get relay token
        let token = this.getRelayToken()

        // Get identity privKey
        let privKey = this.getIdentityPrivKey()

        // Create filter application
        let filterApplication = relayConstructors.constructPriceFilterApplication(true, acceptancePrice, acceptancePrice, privKey)

        // Apply remotely
        await client.applyFilter(idAddress.toLegacyAddress(), filterApplication, token)

        // Apply locally
        this.setAcceptancePrice(acceptancePrice)

        this.$q.loading.hide()
      })
    }
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
