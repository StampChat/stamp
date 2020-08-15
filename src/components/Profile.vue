<template>
  <div>
    <q-splitter
      :value="110"
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
                    :label="$t('profile.name')"
                    :hint="$t('profile.nameHint')"
                    lazy-rules
                    style="width:100%"
                    :rules="[ val => val && val.length > 0 || $t('profile.pleaseType')]"
                  />
                </div>
                <div class="row q-pa-md">
                  <q-input
                    v-model="bio"
                    :label="$t('profile.bio')"
                    :hint="$t('profile.bioHint')"
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
                  <q-toolbar-title>{{ $t('profile.uploadAvatar') }}</q-toolbar-title>

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
                    ref="image"
                    :src="avatar"
                    spinner-color="white"
                  />
                  <div class="text-center">
                    <q-btn
                      flat
                      icon="navigate_before"
                      color="black"
                      @click="cycleAvatarLeft"
                    />
                    <q-btn
                      flat
                      icon="navigate_next"
                      color="black"
                      @click="cycleAvatarRight"
                    />
                  </div>
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
                    :label="$t('profile.minimumStamp')"
                    :hint="$t('profile.minimumStampHint')"
                    style="width:100%"
                    type="number"
                    :rules="[ val => val && val.length > 0 || $t('profile.minimumStampRule')]"
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
import { defaultAvatars } from '../utils/constants'

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
      name: this.value.profile.name,
      bio: this.value.profile.bio,
      avatar: this.value.profile.avatar,
      acceptancePrice: this.value.inbox.acceptancePrice,
      tab: 'profile',
      defaultAvatarIndex: Math.floor(Math.random() * defaultAvatars.length)
    }
  },
  methods: {
    selectLocalAvatar (name) {
      const toDataURL = (callback) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = function () {
          const canvas = document.createElement('CANVAS')
          const ctx = canvas.getContext('2d')
          canvas.height = this.naturalHeight
          canvas.width = this.naturalWidth
          ctx.drawImage(this, 0, 0)
          const dataURL = canvas.toDataURL()
          callback(dataURL)
        }
        img.src = require(`../assets/avatars/${name}`)
      }
      toDataURL((dataUrl) => {
        this.avatar = dataUrl
      })
    },
    cycleAvatarLeft () {
      this.defaultAvatarIndex = ((this.defaultAvatarIndex - 1) + defaultAvatars.length) % defaultAvatars.length
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    },
    cycleAvatarRight () {
      this.defaultAvatarIndex = (this.defaultAvatarIndex + 1) % defaultAvatars.length
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    },
    parseImage () {
      if (this.avatarPath == null) {
        return
      }
      const reader = new FileReader()
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
    },
    constructData () {
      return {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        profile: this.constructProfile,
        inbox: {
          acceptancePrice: this.acceptancePrice
        }
      }
    }
  },
  watch: {
    name () {
      this.$emit('input', this.constructData)
    },
    bio () {
      this.$emit('input', this.constructData)
    },
    avatar () {
      this.$emit('input', this.constructData)
    },
    acceptancePrice () {
      this.$emit('input', this.constructData)
    }
  },
  created () {
    if (!this.avatar) {
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    }
  }
}
</script>
