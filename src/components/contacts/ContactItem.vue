<template>
  <div>
    <q-item
      class='q-pa-none'
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
      class='q-pa-none'
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
      class='q-pa-none'
      clickable
      v-ripple
      v-else-if="contact !== null"
      @click="openChat(address)"
      v-close-popup
    >
      <q-item-section avatar>
        <q-avatar
          rounded
          size="55px"
        >
          <img :src="contact.avatar">
        </q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label>{{contact.name}}</q-item-label>
        <q-item-label
          lines="1"
          caption
        ><span class="text-weight-bold">Address: </span>{{address}}</q-item-label>
        <q-item-label caption><span class="text-weight-bold">Inbox Price: </span> {{contact.acceptancePrice}}</q-item-label>
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
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  props: ['address', 'contact', 'method'],
  methods: {
    ...mapActions({
      openChat: 'chats/openChat',
      deleteContact: 'contacts/deleteContact'
    })
  }
}
</script>
