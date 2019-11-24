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
    ...mapActions(['startClock']),
    ...mapActions({
      startProfileUpdater: 'contacts/startProfileUpdater',
      setProfile: 'myProfile/setMyProfile',
      setClient: 'electrumHandler/setClient',
      walletReinitialize: 'wallet/reinitialize',
      walletReset: 'wallet/reset'
    })
  },
  mounted () {
    this.setProfile({ 'name': null, 'address': null })
  },
  created () {
    // this.walletReset()

    // Reinitialize wallet classes
    this.walletReinitialize()

    // Start internal timer
    // this.startClock()

    // Start profile watcher
    // this.startProfileUpdater()

    let ecl = new ElectrumClient(60002, 'blackie.c3-soft.com', 'tls')
    this.setClient(ecl)
  }
}
</script>
