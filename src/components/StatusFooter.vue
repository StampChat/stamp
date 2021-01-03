<template>
  <q-footer elevated>
    <q-bar>
      <q-space />
      <q-btn
        flat
        :color="connected?'white':'negative'"
        :icon="connected?'account_balance_wallet':'error'"
        label="Wallet"
      />
      <q-space />
    </q-bar>
  </q-footer>
</template>

<script>
export default {
  model: {
    prop: 'isBasic',
    event: 'input'
  },
  props: {
    isBasic: Boolean
  },
  computed: {
    connected () {
      return this.$electrum.connected
    }
  }
}
</script>
