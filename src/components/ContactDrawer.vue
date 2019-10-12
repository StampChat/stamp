<template>
  <q-drawer
    v-model="drawerOpen"
    show-if-above
    side="right"
    elevated
    :width="300"
    :breakpoint="400"
  >
    <q-scroll-area style="height: calc(100% - 150px); margin-top: 150px; border-right: 1px solid #ddd">
      <q-list padding>
        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="notifications_none" />
          </q-item-section>
          <q-item-section>
            Notifications
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="notifications" />
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="share" />
          </q-item-section>

          <q-item-section>
            Share Contact
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="clear_all" />
          </q-item-section>

          <q-item-section>
            Clear History
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon
              name="block"
              color="red"
            />
          </q-item-section>

          <q-item-section>
            Block
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
    <q-img
      class="absolute-top"
      src="https://cdn.quasar.dev/img/material.png"
      style="height: 150px"
    >
      <div class="absolute-bottom bg-transparent">
        <q-avatar
          size="56px"
          class="q-mb-sm"
        >
          <img src="https://cdn.quasar.dev/img/boy-avatar.png">
        </q-avatar>
        <div class="text-weight-bold">{{ getActiveProfile.name }}</div>
        <div>{{ getActiveProfile.address.slice(0,16) }}...</div>
      </div>
    </q-img>
  </q-drawer>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  methods: {
    ...mapGetters({ getProfile: 'contacts/getProfile', getActiveChat: 'chats/getActiveChat' }),
    ...mapActions({ setDrawerOpen: 'contactDrawer/setDrawerOpen' })
  },
  computed: {
    ...mapGetters({
      getDrawerOpen: 'contactDrawer/getDrawerOpen'
    }),
    drawerOpen: {
      get () {
        return this.getDrawerOpen
      },
      set (value) {
        this.setDrawerOpen(value)
      }
    },
    getActiveProfile () {
      let addr = this.getActiveChat()
      let profile = this.getProfile()(addr)
      profile['address'] = addr
      return profile
    }
  },
  data: function () {
    return {
      notifications: false
    }
  }
}
</script>
