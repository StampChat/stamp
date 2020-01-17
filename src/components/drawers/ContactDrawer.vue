<template>
  <q-drawer
    v-model="open"
    show-if-above
    side="right"
    elevated
    :width="300"
    :breakpoint="400"
  >
    <!-- Clear history dialog -->
    <q-dialog
      v-model="confirmClearOpen"
      persistent
    >
      <clear-history-dialog
        :address="address"
        :name="contact.name"
      />
    </q-dialog>

    <!-- Delete chat dialog -->
    <q-dialog
      v-model="confirmDeleteOpen"
      persistent
    >
      <delete-chat-dialog
        :address="address"
        :name="contact.name"
      />
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
          @click="confirmClearOpen = true"
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
        <q-item
          clickable
          v-ripple
          @click="confirmDeleteOpen = true"
        >
          <q-item-section avatar>
            <q-icon
              name="delete"
              color="red"
            />
          </q-item-section>

          <q-item-section>
            Delete
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

    <!-- Contact card -->
    <drawer-contact-card
      :address="address"
      :name="contact.name"
      :avatar="contact.avatar"
      :acceptancePrice="contact.acceptancePrice"
    />
  </q-drawer>
</template>

<script>
import Vue from 'vue'
import { mapGetters, mapActions } from 'vuex'
import DrawerContactCard from './DrawerContactCard.vue'
import ClearHistoryDialog from '../dialogs/ClearHistoryDialog.vue'
import DeleteChatDialog from '../dialogs/DeleteChatDialog.vue'

Vue.filter('truncate', function (text, length, clamp) {
  clamp = clamp || '...'
  var node = document.createElement('div')
  node.innerHTML = text
  var content = node.textContent
  return content.length > length ? content.slice(0, length) + clamp : content
})

export default {
  components: {
    DrawerContactCard,
    ClearHistoryDialog,
    DeleteChatDialog
  },
  props: ['address', 'open', 'contact'],
  methods: {
    ...mapActions({
      setDrawerOpen: 'contactDrawer/setDrawerOpen'
    })
  },
  computed: {
    ...mapGetters({
    }),
    drawerOpen: {
      get () {
        return this.getDrawerOpen
      },
      set (value) {
        this.setDrawerOpen(value)
      }
    }
  },
  data: function () {
    return {
      notifications: false,
      confirmClearOpen: false,
      confirmDeleteOpen: false
    }
  }
}
</script>
