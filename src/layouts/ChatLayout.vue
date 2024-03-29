<template>
  <div>
    <q-drawer v-model="contactDrawerOpen" side="right" :breakpoint="800">
      <right-drawer
        v-if="address"
        :address="address"
        :contact="getContact(address)"
      />
    </q-drawer>

    <!-- Send file dialog -->
    <!-- TODO: Move this up.  We don't need a copy of this dialog for each address (likely) -->
    <q-dialog v-model="sendFileOpen">
      <send-file-dialog :address="address" :file="image" />
    </q-dialog>

    <!-- Send money dialog -->
    <q-dialog v-model="sendMoneyOpen">
      <send-lotus-dialog :address="address" :contact="contactProfile" />
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
          <img :src="contactProfile.avatar" />
        </q-avatar>
        <q-toolbar-title class="h6">{{ contactProfile.name }}</q-toolbar-title>
        <q-space />
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="contactDrawerOpen = !contactDrawerOpen"
          icon="manage_accounts"
        />
      </q-toolbar>
    </q-header>

    <router-view
      @sendFileClicked="toSendFileDialog"
      @giveLotusClicked="sendMoneyOpen = true"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { RouteLocationNormalized } from 'vue-router'

import RightDrawer from '../components/panels/ChatRightDrawer.vue'
import SendFileDialog from '../components/dialogs/SendFileDialog.vue'
import SendLotusDialog from '../components/dialogs/SendLotusDialog.vue'
import { useContactStore } from 'src/stores/contacts'

export default defineComponent({
  emits: ['toggleMyDrawerOpen'],
  components: {
    RightDrawer,
    SendFileDialog,
    SendLotusDialog,
  },
  setup() {
    const contactStore = useContactStore()

    return {
      getContact: contactStore.getContact,
    }
  },
  data() {
    return {
      sendFileOpen: false as boolean,
      sendMoneyOpen: false as boolean,
      address: this.$route.params.address as string,
      contactDrawerOpen: false,
      image: null as unknown | null,
    }
  },
  beforeRouteUpdate(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: () => void,
  ) {
    this.address = to.params.address as string
    next()
  },
  methods: {
    toSendFileDialog(args: unknown) {
      this.image = args
      this.sendFileOpen = true
    },
  },
  computed: {
    contactProfile() {
      return this.getContact(this.address)?.profile
    },
  },
})
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
