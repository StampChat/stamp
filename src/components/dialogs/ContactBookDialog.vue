<template>
  <q-card
    style="width: 500px"
    class='q-px-md'
  >
    <!-- New contact dialog -->
    <q-dialog v-model="newContactOpen">
      <new-contact-dialog />
    </q-dialog>

    <q-card-section class='q-pa-none q-pt-sm'>
      <q-item class='q-pa-none'>
        <q-item-section>
          <div class="text-h6">Contacts</div>
        </q-item-section>
        <q-item-section
          side
          clickable
        >
          <q-btn
            flat
            round
            icon="add"
            color="primary"
            @click="newContactOpen=true"
          />
        </q-item-section>
      </q-item>
    </q-card-section>
    <q-card-section class='q-pa-none q-pb-xs'>
      <q-input
        class="text-bold text-h6"
        v-model="search"
        filled
        dense
        placeholder="Search..."
      />
    </q-card-section>
    <q-card-section class='q-pa-none q-py-xs'>
      <contact-list :contacts="searchContacts(search)" />
    </q-card-section>
    <q-card-actions
      class='q-pa-none q-pt-xs q-pb-sm'
      align="right"
    >
      <q-btn
        flat
        dense
        label="Close"
        color="primary"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import ContactList from '../contacts/ContactList.vue'
import NewContactDialog from '../dialogs/NewContactDialog.vue'
import { mapGetters } from 'vuex'

export default {
  components: {
    ContactList,
    NewContactDialog
  },
  computed: {
    ...mapGetters({
      searchContacts: 'contacts/searchContacts'
    })
  },
  data () {
    return {
      search: '',
      newContactOpen: false
    }
  }
}
</script>
