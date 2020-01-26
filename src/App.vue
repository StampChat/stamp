<template>
  <div id="q-app">
    <router-view />
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
const ElectrumClient = require('electrum-client')

export default {
  name: 'App',
  methods: {
    ...mapActions({
      setClient: 'electrumHandler/setClient',
      startListeners: 'wallet/startListeners'
    }),
    ...mapGetters({
      getAllAddresses: 'wallet/getAllAddresses'
    })
  },
  created () {
    // Set electrum client
    let ecl = new ElectrumClient(51002, 'bch0.kister.net', 'tls')
    this.setClient(ecl)

    // Start electrum listeners
    let addresses = Object.keys(this.getAllAddresses())
    this.startListeners(addresses)
  }
}
</script>
