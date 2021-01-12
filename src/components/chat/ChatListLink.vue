<template>
  <!-- TODO: We need a better way to handle multiple pages and types of chats. -->
  <q-item
    :active="isActive"
    active-class="active-chat-list-item"
    clickable
    @click="setActiveChat(null)"
  >
    <q-item-section avatar>
      <q-avatar rounded>
        <!-- <img src="~assets/shofar.jpg"> -->
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'

export default {
  methods: {
    ...mapMutations({ setActiveChat: 'chats/setActiveChat' })
  },
  computed: {
    ...mapGetters({
      getActiveChat: 'chats/getActiveChat'
    }),
    isActive () {
      return this.getActiveChat === null
    }
  },
  props: {
    title: {
      type: String,
      required: true
    }
  }
}
</script>
<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
}
</style>
