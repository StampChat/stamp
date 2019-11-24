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
    <q-scroll-area style="height: calc(100% - 150px); margin-top: 150px; border-right: 1px solid #ddd">
      <q-list padding>
        <q-item
          clickable
          v-ripple
          @click="newContactPrompt"
        >
          <q-item-section avatar>
            <q-icon name="add_comment" />
          </q-item-section>

          <q-item-section>
            Add Contact
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
    />
  </q-drawer>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ProfileCard from './ProfileCard.vue'

export default {
  components: {
    ProfileCard
  },
  methods: {
    ...mapActions({ setDrawerOpen: 'myDrawer/setDrawerOpen', addNewContact: 'contacts/addNewContact' }),
    newContactPrompt () {
      this.$q.dialog({
        title: 'Add New Contact',
        message: 'Contact address',
        prompt: {
          model: '',
          type: 'text' // optional
        },
        cancel: true,
        persistent: true
      }).onOk(async data => {
        await this.addNewContact(data)
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
