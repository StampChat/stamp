<template>
  <div>
    <q-item v-if="(contact === null)">
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
    <q-item
      clickable
      v-ripple
      v-else-if="contact !== null"
      v-close-popup
    >
      <q-item-section
        avatar
        @click="contactClick(address, contact)"
      >
        <q-avatar
          rounded
          size="55px"
        >
          <img :src="contact.profile.avatar">
        </q-avatar>
      </q-item-section>
      <q-item-section @click="contactClick(address, contact)">
        <q-item-label>{{contact.profile.name}}</q-item-label>
        <q-item-label
          lines="1"
          caption
        ><span class="text-weight-bold">Address: </span>{{address}}</q-item-label>
        <q-item-label caption><span class="text-weight-bold">Inbox Price: </span>{{contact.inbox.acceptancePrice}}</q-item-label>
      </q-item-section>
      <q-item-section
        side
        clickable
        @click="deleteContact(address)"
      >
        <q-btn
          flat
          round
          icon="delete"
          color="red"
        />
      </q-item-section>
    </q-item>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  props: ['address', 'contact', 'method', 'contactClick'],
  methods: {
    ...mapActions({
      deleteContact: 'contacts/deleteContact'
    })
  }
}
</script>
