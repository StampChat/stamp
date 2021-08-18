<template>
  <q-card class="q-ma-sm">
    <q-card-section>
      <div class="text-h6">
        Profile
      </div>
    </q-card-section>
    <profile
      v-model:name="name"
      v-model:bio="bio"
      v-model:avatar="avatar"
      v-model:acceptancePrice="acceptancePrice"
    />
    <q-card-actions align="right">
      <q-btn
        :disable="identical"
        :label="$t('profileDialog.update')"
        color="negative"
        @click="updateRelayData"
      />
      <q-btn
        :label="$t('profileDialog.cancel')"
        color="primary"
        @click="cancel"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapMutations, mapGetters } from 'vuex'
import Profile from '../components/Profile'
import { errorNotify } from '../utils/notifications'

export default {
  data () {
    console.log('relay data', this.getRelayData())
    const relayData = this.getRelayData()
    return {
      name: relayData.profile.name,
      bio: relayData.profile.bio,
      avatar: relayData.profile.avatar,
      acceptancePrice: relayData.inbox.acceptancePrice
    }
  },
  components: {
    Profile
  },
  methods: {
    ...mapMutations({ setRelayData: 'myProfile/setRelayData' }),
    ...mapGetters('myProfile', ['getRelayData']),
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
      } finally {
        this.$q.loading.hide()
      }
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
    cancel () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    }
  },
  computed: {
    profile () {
      return {
        name: this.name,
        bio: this.bio,
        avatar: this.avatar
      }
    },
    relayData () {
      return {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        profile: this.profile,
        inbox: {
          acceptancePrice: this.acceptancePrice
        }
      }
    },
    identical () {
      const currentProfile = this.getRelayData().profile
      return currentProfile.name === this.name && currentProfile.bio === this.bio && currentProfile.avatar === this.avatar
    }
  }
}
</script>
