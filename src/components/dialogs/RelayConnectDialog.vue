<template>
  <q-card>
    <q-card-section class="row items-center">
      <q-avatar
        icon="signal_wifi_off"
        color="red"
        text-color="white"
      />
      <span class="q-ml-sm">Lost connection to relay server. Would you like to reconnect?</span>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        label="Close"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        label="Retry"
        color="primary"
        v-close-popup
        @click='connect'
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  methods: {
    ...mapGetters({
      getClient: 'relayClient/getClient',
      getToken: 'relayClient/getToken',
      getAddr: 'wallet/getMyAddress'
    }),
    connect () {
      let client = this.getClient()
      let token = this.getToken()
      client.setUpWebsocket(this.getAddr(), token)
    }
  }
}
</script>
