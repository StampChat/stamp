<template>
  <q-footer elevated>
    <q-bar>
      <q-space />
      <q-btn
        flat
        :color="$indexer.connected ? 'white' : 'negative'"
        :icon="$indexer.connected ? 'account_balance_wallet' : 'error'"
        label="Wallet"
      />
      <q-space />
    </q-bar>
  </q-footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    return {}
  },
})
</script>
