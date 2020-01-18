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
      setClient: 'electrumHandler/setClient'
    })
  },
  created () {
    // this.walletReset()

    let ecl = new ElectrumClient(51002, 'bch0.kister.net', 'tls')
    this.setClient(ecl)
  }
}
</script>
