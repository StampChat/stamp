<template>
  <q-layout view="hHh Lpr fFf">
    <q-page-container>
      <router-view />
    </q-page-container>
    <wallet-footer />
  </q-layout>
</template>

<script>
import WalletFooter from '../components/WalletFooter.vue'

export default {
  components: {
    WalletFooter
  }
}
</script>
