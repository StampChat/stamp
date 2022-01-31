<template>
  <q-layout
    view="lhh LpR lff"
    container
    class="hide-scrollbar absolute full-width"
  >
    <q-drawer
      v-model="contactDrawerOpen"
      side="right"
      :breakpoint="800"
    >
      <right-drawer
        v-if="address"
        :address="address"
        :contact="getContact(address)"
      />
    </q-drawer>

    <!-- Send file dialog -->
    <!-- TODO: Move this up.  We don't need a copy of this dialog for each address (likely) -->
    <q-dialog v-model="sendFileOpen">
      <send-file-dialog :address="address" />
    </q-dialog>

    <!-- Send money dialog -->
    <q-dialog v-model="sendMoneyOpen">
      <send-lotus-dialog
        :address="address"
        :contact="contactProfile"
      />
    </q-dialog>

    <q-header>
      <q-toolbar class="q-pl-sm">
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="() => $emit('toggleMyDrawerOpen')"
          icon="menu"
        />
        <q-avatar rounded>
          <img :src="contactProfile.avatar">
        </q-avatar>
        <q-toolbar-title class="h6">
          {{ contactProfile.name }}
        </q-toolbar-title>
        <q-space />
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="contactDrawerOpen = !contactDrawerOpen"
          icon="person"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="q-pt-xs">
        <router-view
          @sendFileClicked="sendFileOpen = true"
          @giveLotusClicked="sendMoneyOpen = true"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { mapGetters } from 'vuex'

import RightDrawer from '../components/panels/ChatRightDrawer.vue'
import SendFileDialog from '../components/dialogs/SendFileDialog.vue'
import SendLotusDialog from '../components/dialogs/SendLotusDialog.vue'

export default {
  props: { },
  emits: ['toggleMyDrawerOpen'],
  components: {
    RightDrawer,
    SendFileDialog,
    SendLotusDialog
  },
  data () {
    return {
      // TODO: Timer isn't used delete
      timer: null,
      sendFileOpen: false,
      sendMoneyOpen: false,
      address: this.$route.params.address,
      contactDrawerOpen: false
    }
  },
  beforeRouteUpdate (to, from, next) {
    this.address = to.params.address
    next()
  },
  unmounted () {
    clearTimeout(this.timer)
  },
  computed: {
    ...mapGetters({
      getContact: 'contacts/getContact'
    }),
    contactProfile () {
      return this.getContact(this.address).profile
    }
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  color: var(--q-color-text);
  background: var(--q-color-background);
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}

.scroll-area-bordered {
  border-right: 1px;
  border-right-style: solid;
  border-right-color: $separator-color;
  border-bottom: 1px;
  border-bottom-style: solid;
  border-bottom-color: $separator-color;
}
</style>
