<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Contacts</div>
    </q-card-section>
    <contact-list :contacts="getContacts" />
  </q-card>
</template>

<script>
import ContactList from '../contacts/ContactList.vue'
import { mapGetters } from 'vuex'

export default {
  components: {
    ContactList
  },
  computed: {
    ...mapGetters({
      getContacts: 'contacts/getAll'
    })
  }
}
</script>
