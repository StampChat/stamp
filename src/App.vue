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
    let ecl = new ElectrumClient(50001, '35.238.56.17', 'tcp')
    this.setClient(ecl)

    // Start electrum listeners
    let addresses = Object.keys(this.getAllAddresses())
    this.startListeners(addresses)
  }
}
</script>
