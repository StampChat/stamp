<template>
  <div id="q-app">
    <router-view />
  </div>
</template>

<script>
import { mapActions } from 'vuex'
const ElectrumClient = require('electrum-client')

export default {
  name: 'App',
  methods: {
    ...mapActions({
      setClient: 'electrumHandler/setClient',
      startListeners: 'wallet/startListeners'
    })
  },
  created () {
    // Set electrum client
    let ecl = new ElectrumClient(51002, 'bch0.kister.net', 'tls')
    this.setClient(ecl)

    // Start electrum listeners
    this.startListeners()
  }
}
</script>
