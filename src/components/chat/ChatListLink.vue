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
        <img src="~assets/stamp-icon.png" v-if="!icon" />
        <q-icon :name="icon" v-if="icon" />
      </q-avatar>
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ title }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  setup(props) {
    const router = useRouter()
    return {
      isActive: computed(() => {
        return router.currentRoute.value.path === props.route
      }),
      setRoute() {
        router.push(props.route).catch(() => {
          // Don't care. Probably duplicate route
        })
      },
    }
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    route: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: false,
      default: () => null,
    },
  },
})
</script>
<style lang="scss" scoped>
.active-chat-list-item {
  background: var(--q-color-bg-active);
}
</style>
