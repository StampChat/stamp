<template>
  <!-- TODO: We need a better way to handle multiple pages and types of chats. -->
  <q-item
    :active="isActive"
    active-class="active-chat-list-item"
    clickable
    @click="setRoute()"
  >
    <q-item-section avatar>
      <q-avatar rounded>
        <img
          src="~assets/stamp-icon.png"
          v-if="!icon"
        >
        <q-icon
          :name="icon"
          v-if="icon"
        />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script>

export default {
  methods: {
    setRoute () {
      this.$router.push(this.route).catch(() => {
        // Don't care. Probably duplicate route
      })
    }
  },
  computed: {
    isActive () {
      return this.$route.path === this.route
    }
  },
  props: {
    title: {
      type: String,
      required: true
    },
    route: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: false,
      default: () => null
    }
  }
}
</script>
<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
}
</style>
