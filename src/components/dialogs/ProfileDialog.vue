<template>
  <q-card class="q-px-sm q-pb-md dialog-large">
    <q-card-section>
      <div class="text-h6">
        Profile
      </div>
    </q-card-section>
    <profile v-model="relayData" />
    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('profileDialog.cancel')"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :disable="identical"
        :label="$t('profileDialog.update')"
        color="primary"
        v-close-popup
        @click="updateRelayData()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapMutations, mapGetters } from 'vuex'
import Profile from '../Profile'
import { errorNotify } from '../../utils/notifications'

export default {
  props: {
    currentProfile: {
      type: Object,
      default: () => ({})
    }
  },
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
    ...mapMutations({ setRelayData: 'myProfile/setRelayData' }),
    async updateRelayData () {
      // Set profile
      const client = this.$relayClient

      // Create metadata
      const idPrivKey = this.$wallet.identityPrivKey
      const acceptancePrice = this.relayData.inbox.acceptancePrice

      this.$q.loading.show({
        delay: 100,
        message: this.$t('profileDialog.pushingProfile')
      })

      try {
        await client.updateProfile(idPrivKey, this.relayData.profile, acceptancePrice)
        this.setRelayData(this.relayData)
      } catch (err) {
        console.error(err)
        // TODO: Move specialization down error displayer
        if (err.response.status === 413) {
          errorNotify(new Error(this.$t('profileDialog.avatarTooLarge')))
          this.$q.loading.hide()
          throw err
        }
        errorNotify(new Error(this.$t('profileDialog.unableContactRelay')))
        throw err
      }
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
