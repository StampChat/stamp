<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">{{ $t('contactBookDialog.contacts') }}</div>
      <q-space />
      <q-btn
        flat
        round
        icon="add"
        color="primary"
        @click="newContactOpen = true"
      />
    </q-card-section>

    <q-card-section class="q-pb-none">
      <q-input
        class="text-bold text-h6"
        v-model="search"
        filled
        dense
        :placeholder="$t('contactBookDialog.search')"
        ref="contactSearch"
      />
    </q-card-section>
    <q-card-section class="q-pb-none">
      <contact-list
        :contacts="searchContacts(search)"
        :contact-click="contactClick"
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn flat :label="$t('close')" color="primary" v-close-popup />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { QInput } from 'quasar'
import { storeToRefs } from 'pinia'

import ContactList from '../contacts/ContactList.vue'
import { ContactState, useContactStore } from 'src/stores/contacts'

export default defineComponent({
  props: {
    contactClick: {
      type: Function,
      required: true,
    },
  },
  setup() {
    const contactStore = useContactStore()
    const { getContacts } = storeToRefs(contactStore)
    return {
      contacts: getContacts,
    }
  },
  components: {
    ContactList,
  },
  methods: {
    searchContacts(searchPrefix: string) {
      const contacts = this.contacts
      if (!contacts) {
        return
      }
      const sortedContacts = Object.entries(contacts).sort((e1, e2) => {
        return Number(e1[0]) - Number(e2[0])
      })

      const result = {} as Record<string, ContactState>
      for (const [address, contact] of sortedContacts) {
        const lowerSearch = searchPrefix.toLowerCase()
        if (!contact) {
          continue
        }
        if (
          contact?.profile.name?.toLowerCase().includes(lowerSearch) ||
          address.toLowerCase().includes(lowerSearch)
        ) {
          result[address] = contact
        }
      }

      return result
    },
  },
  data() {
    return {
      search: '',
      newContactOpen: false,
    }
  },
  mounted() {
    const contactSearch = this.$refs.contactSearch as QInput
    contactSearch.$el.focus()
  },
})
</script>
