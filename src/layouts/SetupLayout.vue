<template>
  <div>
    <router-view />
    <status-footer />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import StatusFooter from '../components/StatusFooter.vue'

export default defineComponent({
  components: { StatusFooter },
})
</script>
