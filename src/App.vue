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
      setProfile: 'myProfile/setMyProfile'
    })
  },
  mounted () {
    this.setProfile({ 'name': null, 'address': null })
  },
  created () {
    this.startClock()
    // this.startProfileUpdater()
  }
}
</script>
