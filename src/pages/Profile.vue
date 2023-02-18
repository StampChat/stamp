<template>
  <q-page-container>
    <q-page class="q-ma-none q-pa-sm">
      <q-card>
        <q-card-section>
          <div class="text-h6">
            {{ $t('profileDialog.profile') }}
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
            :label="$t('profileDialog.cancel')"
            color="negative"
            @click="cancel"
          />
          <q-btn
            :disable="identical"
            :label="$t('profileDialog.update')"
            color="primary"
            @click="updateRelayData"
          />
        </q-card-actions>
      </q-card>
    </q-page>
  </q-page-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useProfileStore } from 'src/stores/my-profile'

import Profile from '../components/Profile.vue'
import { errorNotify } from '../utils/notifications'

type ProfileData = {
  name?: string
  bio?: string
  avatar?: string
}

type RelayData = {
  profile: ProfileData
  inbox: {
    acceptancePrice?: number
  }
}

export default defineComponent({
  setup() {
    const myProfile = useProfileStore()
    return {
      setRelayData: myProfile.setRelayData,
      storedRelayData: myProfile,
    }
  },
  data() {
    const myProfile = useProfileStore()

    return {
      name: myProfile.profile.name,
      bio: myProfile.profile.bio,
      avatar: myProfile.profile.avatar,
      acceptancePrice: myProfile.inbox.acceptancePrice,
    }
  },
  components: {
    Profile,
  },
  methods: {
    async updateRelayData() {
      // Set profile
      const client = this.$relayClient

      // Create metadata
      const idPrivKey = this.$wallet.identityPrivKey
      if (!idPrivKey) {
        return
      }
      const acceptancePrice = this.relayData.inbox.acceptancePrice

      this.$q.loading.show({
        delay: 100,
        message: this.$t('profileDialog.pushingProfile'),
      })

      try {
        await client.updateProfile(
          idPrivKey,
          this.relayData.profile,
          acceptancePrice,
        )
        this.setRelayData(this.relayData)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
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
    cancel() {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
  },
  computed: {
    profile(): ProfileData {
      return {
        name: this.name,
        bio: this.bio,
        avatar: this.avatar,
      }
    },
    relayData(): RelayData {
      return {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        profile: this.profile,
        inbox: {
          acceptancePrice: this.acceptancePrice,
        },
      }
    },
    identical(): boolean {
      const currentProfile = this.storedRelayData.profile
      return (
        currentProfile.name === this.name &&
        currentProfile.bio === this.bio &&
        currentProfile.avatar === this.avatar
      )
    },
  },
})
</script>
