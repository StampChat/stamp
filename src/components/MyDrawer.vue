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
        >
          <q-item-section avatar>
            <q-icon name="add_comment" />
          </q-item-section>

          <q-item-section>
            New Thread
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-img :src="getMyProfile.avatar" />
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
      :address="getMyProfile.address"
      :name="getMyProfile.name"
      :bio="getMyProfile.bio"
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
    ...mapActions({ setDrawerOpen: 'myDrawer/setDrawerOpen' })
  },
  computed: {
    ...mapGetters({
      getDrawerOpen: 'myDrawer/getDrawerOpen',
      getMyProfile: 'myProfile/getMyProfile'
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
