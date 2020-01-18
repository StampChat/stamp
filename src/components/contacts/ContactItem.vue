<template>
  <span>
    <q-item
      class="q-py-none"
      v-if="(contact === null)"
    >
      <q-item-section avatar>
        <q-icon
          color="negative"
          name="error"
          size="xl"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label>Not found</q-item-label>
        <!-- TODO: Error information here -->
      </q-item-section>
    </q-item>
    <q-item
      class="q-py-none"
      v-else-if="contact === 'loading'"
    >
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
    <q-item
      clickable
      v-ripple
      v-else-if="contact !== null"
      class="q-py-none"
      v-close-popup
    >
      <q-item-section avatar>
        <q-avatar rounded>
          <img
            :src="contact.avatar"
            size="xl"
          >
        </q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label>{{contact.name}}</q-item-label>
        <q-item-label caption>Inbox Fee: {{contact.acceptancePrice}}</q-item-label>
      </q-item-section>
      <q-item-section
        side
        clickable
      >
        <q-btn
          flat
          round
          icon="delete"
          color="red"
          @click="deleteContact(address)"
        />
      </q-item-section>
    </q-item>
  </span>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  props: ['address', 'contact', 'method'],
  methods: {
    ...mapActions({
      deleteContact: 'contacts/deleteContact'
    })
  }
}
</script>
