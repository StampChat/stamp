<template>
  <div>
    <router-view :is-basic="isBasic" />
    <status-footer v-model="isBasic" />
  </div>
</template>

<script>
import StatusFooter from '../components/StatusFooter.vue'

export default {
  components: { StatusFooter },
  data() {
    return {
      leftDrawer: true,
      isBasic: true,
    }
  },
}
</script>
