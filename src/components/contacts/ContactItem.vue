<template>
  <div :mouseover="$emit('mouseover-contact', address)">
    <q-item v-if="contact === null">
      <q-item-section avatar>
        <q-icon color="negative" name="error" size="xl" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ $t('contactItem.notFound') }}</q-item-label>
        <!-- TODO: Error information here -->
      </q-item-section>
    </q-item>
    <q-item v-else-if="contact === 'loading'">
      <q-item-section avatar>
        <q-skeleton type="QAvatar" />
      </q-item-section>
      <q-item-section>
        <q-item-label>
          <q-skeleton type="text" />
        </q-item-label>
        <q-item-label caption>
          <q-skeleton type="text" />
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item v-ripple v-else-if="contact" v-close-popup>
      <q-item-section avatar @click="contactClick(address, contact)">
        <q-avatar rounded size="55px">
          <img :src="contact.profile.avatar" />
        </q-avatar>
      </q-item-section>
      <q-item-section @click="contactClick(address, contact)">
        <q-item-label>{{ contact.profile.name }}</q-item-label>
        <q-item-label lines="1" caption>
          <span class="text-weight-bold">{{ $t('contactItem.address') }}:</span>
          {{ address }}
        </q-item-label>
        <q-item-label caption>
          <span class="text-weight-bold"
            >{{ $t('contactItem.inboxPrice') }}:</span
          >
          {{ contact.inbox.acceptancePrice }}
        </q-item-label>
      </q-item-section>
      <q-item-section side @click="deleteContact(address)">
        <q-btn flat round icon="delete" color="red" />
      </q-item-section>
    </q-item>
  </div>
</template>

<script lang="ts">
import { useContactStore } from 'src/stores/contacts'
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    address: {
      type: String,
      default: () => '',
    },
    contact: {
      type: Object,
      default: () => ({}),
    },
    contactClick: {
      type: Function,
      default: () => '',
    },
  },
  emits: ['mouseover-contact'],
  setup() {
    const contactStore = useContactStore()
    return {
      deleteContact: contactStore.deleteContact,
    }
  },
})
</script>
