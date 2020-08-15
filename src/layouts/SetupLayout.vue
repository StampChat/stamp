<template>
  <q-layout view="hHh Lpr fFf">
    <q-page-container>
      <router-view :is-basic="isBasic" />
    </q-page-container>

    <status-footer v-model="isBasic" />
  </q-layout>
</template>

<script>
import StatusFooter from '../components/StatusFooter.vue'

export default {
  components: { StatusFooter },
  data () {
    return {
      leftDrawer: true,
      isBasic: true
    }
  }
}
</script>
