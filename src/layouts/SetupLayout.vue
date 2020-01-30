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
import { mapActions } from 'vuex'

export default {
  components: { StatusFooter },
  methods: {
    ...mapActions({ resetWallet: 'wallet/reset' })
  },
  data () {
    return {
      leftDrawer: true
    }
  },
  created () {
    this.resetWallet()
  }
}
</script>
