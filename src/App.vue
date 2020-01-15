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
      startChatUpdater: 'chats/startChatUpdater',
      setProfile: 'myProfile/setMyProfile',
      setClient: 'electrumHandler/setClient',
      walletReinitialize: 'wallet/reinitialize',
      relayClientReinitialize: 'relayClient/reinitialize',
      walletReset: 'wallet/reset'
    })
  },
  created () {
    // this.walletReset()

    // Reinitialize wallet classes
    this.walletReinitialize()

    // Reinitialize relay client
    this.relayClientReinitialize()

    // Start internal timer
    this.startClock()

    // Start profile watcher
    this.startProfileUpdater()

    // Start chat watcher
    this.startChatUpdater()

    let ecl = new ElectrumClient(51002, 'bch0.kister.net', 'tls')
    this.setClient(ecl)
  }
}
</script>
