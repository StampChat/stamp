<template>
  <q-card
    style="min-width: 80vw;"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Profile</div>
    </q-card-section>
    <q-card-section>
      <profile v-model="relayData" />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :disable="identical"
        label="Update"
        color="primary"
        v-close-popup
        @click="updateRelayData()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Profile from '../Profile'
import { constructProfileMetadata, constructPriceFilter } from '../../relay/constructors'
import {
  relayDisconnectedNotify,
  profileTooLargeNotify
} from '../../utils/notifications'

export default {
  props: ['currentProfile'],
  data () {
    return {
      relayData: this.getRelayData()
    }
  },
  components: {
    Profile
  },
  methods: {
    ...mapGetters({
      getRelayData: 'myProfile/getRelayData'
    }),
    ...mapActions({ setRelayData: 'myProfile/setRelayData' }),
    async updateRelayData () {
      // Set profile
      let client = this.$relayClient

      // Create metadata
      let idPrivKey = this.$wallet.identityPrivKey

      let acceptancePrice = this.relayData.inbox.acceptancePrice
      let priceFilter = constructPriceFilter(true, acceptancePrice, acceptancePrice, idPrivKey)
      let metadata = constructProfileMetadata(this.relayData.profile, priceFilter, idPrivKey)

      this.$q.loading.show({
        delay: 100,
        message: 'Pushing new Profile...'
      })

      // Apply remotely
      let idAddress = this.$wallet.myAddress
      try {
        await client.putProfile(idAddress.toLegacyAddress(), metadata)
      } catch (err) {
        console.error(err)
        if (err.response.status === 413) {
          profileTooLargeNotify()
          throw err
        }
        relayDisconnectedNotify()
        throw err
      }

      // Apply
      this.setRelayData(this.relayData)

      this.$q.loading.hide()
    }
  },
  computed: {
    constructProfile () {
      if (this.name === '' || this.avatar === null) {
        return null
      } else {
        return {
          name: this.name,
          bio: this.bio,
          avatar: this.avatar
        }
      }
    },
    identical () {
      return this.currentProfile.name === this.name && this.currentProfile.bio === this.bio && this.currentProfile.avatar === this.avatar
    }
  }
}
</script>
