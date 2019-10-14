<template>
  <q-drawer
    v-model="drawerOpen"
    show-if-above
    side="right"
    elevated
    :width="300"
    :breakpoint="400"
  >
    <!-- Delete dialog -->
    <q-dialog
      v-model="confirm"
      persistent
      @click="clearChat(getActiveProfile.address)"
    >
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar
            icon="delete"
            color="red"
            text-color="white"
          />
          <span class="q-ml-sm">Are you sure you want to clear this conversation?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            color="primary"
            v-close-popup
          />
          <q-btn
            flat
            label="Delete"
            color="primary"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Scroll area -->
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
          @click="confirm = true"
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

    <!-- Contact card -->
    <profile-card
      :address="getActiveProfile.address"
      :name="getActiveProfile.name"
    />
  </q-drawer>
</template>

<script>
import Vue from 'vue'
import { mapGetters, mapActions } from 'vuex'
import ProfileCard from './ProfileCard.vue'

Vue.filter('truncate', function (text, length, clamp) {
  clamp = clamp || '...'
  var node = document.createElement('div')
  node.innerHTML = text
  var content = node.textContent
  return content.length > length ? content.slice(0, length) + clamp : content
})

export default {
  components: {
    ProfileCard
  },
  methods: {
    ...mapGetters({ getProfile: 'contacts/getProfile', getActiveChat: 'chats/getActiveChat' }),
    ...mapActions({ setDrawerOpen: 'contactDrawer/setDrawerOpen', clearChat: 'chats/clearChat' })
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
      notifications: false,
      confirm: false
    }
  }
}
</script>
