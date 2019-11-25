<template>
  <q-list>
    <chat-list-item
      v-for="(addr, index) in getChatOrder"
      v-bind:key="index"
      v-bind:chatAddr="addr"
    />
    <q-item v-if="chatAddr === null">
      <q-item-section>
        <q-item-label>Add contacts from the drawer above...</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script>
import ChatListItem from './ChatListItem.vue'
import { mapGetters } from 'vuex'

export default {
  components: {
    ChatListItem
  },
  computed: {
    ...mapGetters({ getChatOrder: 'chats/getChatOrder' })
  },
  props: ['chatAddr']
}
</script>
