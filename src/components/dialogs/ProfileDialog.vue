<template>
  <q-card
    style="min-width: 80vw;"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Profile</div>
    </q-card-section>
    <q-card-section>
      <div class="row">
        <div class="col">
          <div class="row">
            <q-input
              outlined
              v-model="name"
              label="Name *"
              hint="Name displayed to others"
              lazy-rules
              style="width:100%"
              :rules="[ val => val && val.length > 0 || 'Please type something']"
            />
          </div>
          <div class="row q-py-md">
            <q-input
              v-model="bio"
              label="Bio"
              hint="Short biolography displayed to others"
              outlined
              style="width:100%"
              autogrow
            />
          </div>
        </div>
        <div class="col-4 q-px-md">
          <q-toolbar
            class="bg-primary text-white shadow-2"
            style="border-radius: 10px 10px 0px 0px"
          >
            <q-toolbar-title>Upload Avatar</q-toolbar-title>

            <q-input
              @input="val => { avatarPath = val[0] }"
              ref="displayPicker"
              style="display:none"
              type="file"
              label="Standard"
              @change="parseImage"
            />
            <q-btn
              type="file"
              flat
              round
              dense
              icon="add_a_photo"
              @click="$refs.displayPicker.$el.click()"
            />
          </q-toolbar>
          <div>
            <q-img
              :src="avatar"
              spinner-color="white"
            />
          </div>
        </div>
      </div>
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
        @click="sendStealthPayment()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import KeyserverHandler from '../../keyserver/handler'
import pop from '../../pop/index'

export default {
  props: ['currentProfile'],
  data () {
    return {
      name: this.currentProfile.name,
      bio: this.currentProfile.bio,
      avatar: this.currentProfile.avatar,
      avatarPath: null
    }
  },
  getters: {
    ...mapGetters({ getKsHandler: 'keyserverHandler/getHandler' })
  },
  methods: {
    ...mapActions({ setMyProfile: 'myProfile/setMyProfile' }),
    parseImage () {
      if (this.avatarPath == null) {
        return
      }
      var reader = new FileReader()
      reader.readAsDataURL(this.avatarPath)
      reader.onload = () => {
        this.avatar = reader.result
      }
    },
    async updateProfile () {
      // Set profile
      let ksHandler = this.getKsHandler()
      let serverUrl = ksHandler.chooseServer()

      // Request Payment
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      let idAddress = this.getMyAddress()
      let { paymentDetails } = await KeyserverHandler.paymentRequest(serverUrl, idAddress)
      this.$q.loading.show({
        delay: 100,
        message: 'Sending Payment...'
      })

      let { paymentUrl, payment } = await pop.constructPaymentTransaction(paymentDetails)
      let { token } = await pop.sendPayment(paymentUrl, payment)

      this.$q.loading.show({
        delay: 100,
        message: 'Uploading Metadata...'
      })

      // Construct metadata
      let idPrivKey = this.getIdentityPrivKey()
      let metadata = KeyserverHandler.constructProfileMetadata(this.profile, idPrivKey)

      // Put to keyserver
      await KeyserverHandler.putMetadata(idAddress, serverUrl, metadata, token)

      // Set locally
      this.setMyProfile({ name: this.name, bio: this.bio, avatar: this.avatar })

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
