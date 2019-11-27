<template>
  <q-chat-message
    class="q-py-sm"
    :avatar="message.sent?this.getProfile(targetAddr).avatar:this.getMyProfile.avatar"
    :text="[message.body]"
    :sent="message.outbound"
    :stamp="timeStamp"
  />
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  methods: {
    ...mapGetters(['getUnixTime']),
    ...mapActions(['updateClock']),
    unixToStamp (unixTime, dateNow) {
      let nowTs = Math.floor(dateNow / 1000)
      let seconds = nowTs - unixTime

      if (seconds > 2 * 24 * 3600) {
        return 'a few days ago'
      }
      if (seconds > 24 * 3600) {
        return 'yesterday'
      }
      if (seconds > 3600) {
        return 'a few hours ago'
      }
      if (seconds > 1800) {
        return 'half an hour ago'
      }
      if (seconds > 120) {
        return Math.floor(seconds / 60) + ' minutes ago'
      }
      if (seconds > 60) {
        return '1 minute ago'
      }
      return 'just now'
    }
  },
  computed: {
    ...mapGetters({ getProfile: 'contacts/getProfile', getMyProfile: 'myProfile/getMyProfile' }),
    timeStamp () {
      let unixTime = this.getUnixTime()
      let stamp = this.unixToStamp(this.message.timestamp, unixTime)
      return stamp
    }
  },
  created () {
    this.updateClock()
  },
  props: ['message', 'targetAddr']
}
</script>
