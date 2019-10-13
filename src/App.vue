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
      startProfileUpdater: 'contacts/startProfileUpdater'
    })
  },
  created () {
    this.startClock()
    this.startProfileUpdater()
  }
}
</script>
