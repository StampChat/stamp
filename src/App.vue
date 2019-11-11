<template>
  <div id="q-app">
    <router-view />
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'App',
  methods: {
    ...mapActions(['startClock']),
    ...mapActions({
      startProfileUpdater: 'contacts/startProfileUpdater',
      setProfile: 'myProfile/setMyProfile',
      newPhotonClient: 'photonHandler/new'
    })
  },
  mounted () {
    this.setProfile({ 'name': null, 'address': null })
  },
  created () {
    this.startClock()
    // this.startProfileUpdater()

    this.newPhotonClient('localhost:50051')
  }
}
</script>
