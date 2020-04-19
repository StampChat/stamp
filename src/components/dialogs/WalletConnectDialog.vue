<template>
  <q-card>
    <q-card-section class="row items-center">
      <q-avatar
        icon="signal_wifi_off"
        color="red"
        text-color="white"
      />
      <span class="q-ml-sm">Lost connection to wallet server. Would you like to reconnect?</span>
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
export default {
  methods: {
    connect () {
      this.$electrumClient.connect()
    }
  }
}
</script>
