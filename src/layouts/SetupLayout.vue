<template>
  <q-layout view="hHh Lpr fFf">
    <q-page-container>
      <router-view />
    </q-page-container>

    <status-footer />
  </q-layout>
</template>

<script>
import StatusFooter from '../components/StatusFooter.vue'
export default {
  components: { StatusFooter },
  data () {
    return {
      leftDrawer: true
    }
  }
}
</script>
