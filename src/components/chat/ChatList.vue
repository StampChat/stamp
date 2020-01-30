<template>
  <q-list>
    <chat-list-item
      v-for="(addr, index) in getChatOrder"
      :key="index"
      :chatAddr="addr"
      :numUnread="getNumUnread(addr)"
    />
    <q-item v-if="getChatOrder.length === 0">
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
    ...mapGetters({
      getChatOrder: 'chats/getChatOrder',
      getNumUnread: 'chats/getNumUnread'
    })
  },
  props: ['chatAddr']
}
</script>
