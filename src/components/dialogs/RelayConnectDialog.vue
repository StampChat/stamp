<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section class="row items-center">
      <q-avatar icon="signal_wifi_off" color="red" text-color="white" />
      <span class="q-ml-sm"
        >Lost connection to relay server. Would you like to reconnect?</span
      >
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Close" color="primary" v-close-popup />
      <q-btn
        flat
        label="Retry"
        color="primary"
        v-close-popup
        @click="connect"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { useRelayClient, useWallet } from 'src/utils/clients'
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const wallet = useWallet()
    const relayClient = useRelayClient()

    return {
      connect() {
        if (!wallet.myAddress) {
          return
        }
        relayClient.setUpWebsocket(wallet.myAddress)
      },
    }
  },
})
</script>
