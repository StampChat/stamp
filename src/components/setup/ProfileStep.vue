<template>
  <div>
    <q-splitter
      :value=110
      unit="px"
      disable
    >
      <template v-slot:before>
        <q-tabs
          v-model="tab"
          vertical
          class="text-primary"
        >
          <q-tab
            name="profile"
            icon="person"
            label="Profile"
          />
          <q-tab
            name="inbox"
            icon="mail"
            label="Inbox"
          />
        </q-tabs>
      </template>
      <template v-slot:after>
        <q-tab-panels
          v-model="tab"
          animated
          transition-prev="jump-up"
          transition-next="jump-up"
        >
          <q-tab-panel name="profile">
            <div class="row">
              <div class="col">
                <div class="row q-pa-md">
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
                <div class="row q-pa-md">
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
              <div class="col-4 q-pa-md">
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
          </q-tab-panel>
          <q-tab-panel name="inbox">
            <div class="row">
              <div class="col">
                <div class="row q-pa-md">
                  <q-input
                    outlined
                    v-model="acceptancePrice"
                    label="Inbox Fee *"
                    hint="The minimum fee required for strangers to message you"
                    style="width:100%"
                    type="number"
                    :rules="[ val => val && val.length > 0 || 'Please input an inbox fee']"
                  />
                </div>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script>
import { defaultAcceptancePrice } from '../../utils/constants'

export default {
  props: {
    // value: {
    //   inbox: {
    //     acceptancePrice: ...,
    //   },
    //   profile: {
    //     name: ...,
    //     bio: ...,
    //     avatar: ...
    //   }
    // }
    value: Object
  },
  data () {
    return {
      name: '',
      bio: '',
      avatar: null,
      acceptancePrice: defaultAcceptancePrice,
      tab: 'profile'
    }
  },
  methods: {
    parseImage () {
      if (this.avatarPath == null) {
        return
      }
      var reader = new FileReader()
      reader.readAsDataURL(this.avatarPath)
      reader.onload = () => {
        this.avatar = reader.result
      }
    }
  },
  computed: {
    constructProfile () {
      return {
        name: this.name,
        bio: this.bio,
        avatar: this.avatar
      }
    }
  },
  watch: {
    name (newUrl, oldUrl) {
      this.value.profile = this.constructProfile
    },
    bio (newPrice, oldPrice) {
      this.value.profile = this.constructProfile
    },
    avatar (newAvatar, oldAvatar) {
      this.value.profile = this.constructProfile
    }
  }
}
</script>
