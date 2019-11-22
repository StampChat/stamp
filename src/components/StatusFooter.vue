<template>
  <q-footer elevated>
    <q-bar>
      <q-space />
      <q-btn
        dense
        flat
        :color="connected?'white':'red'"
        :icon="connected?'account_balance_wallet':'error'"
        label="Wallet"
      />
    </q-bar>
  </q-footer>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  computed: {
    ...mapGetters({ connected: 'electrumHandler/connected' })
  }
}
</script>
