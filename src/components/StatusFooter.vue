<template>
  <q-footer elevated>
    <q-bar>
      <q-space />
      <q-btn
        dense
        flat
        :color="connected?'white':'negative'"
        :icon="connected?'account_balance_wallet':'error'"
        label="Wallet"
      />
    </q-bar>
  </q-footer>
</template>

<script>
export default {
  computed: {
    connected () {
      return this.$electrum.connected
    }
  }
}
</script>
