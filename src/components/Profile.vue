<template>
  <div>
    <q-splitter
      v-model="splitterSize"
      unit="px"
      disable
    >
      <template #before>
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
      <template #after>
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
                    v-model="internalName"
                    :label="$t('profile.name')"
                    :hint="$t('profile.nameHint')"
                    lazy-rules
                    style="width:100%"
                    :rules="[ val => val && val.length > 0 || $t('profile.pleaseType')]"
                  />
                </div>
                <div class="row q-pa-md">
                  <q-input
                    v-model="internalBio"
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
                    :src="internalAvatar"
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
                    v-model="internalAceptancePrice"
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
    name: {
      type: String,
      default: () => ('')
    },
    bio: {
      type: String,
      default: () => ('')
    },
    avatar: {
      type: String,
      default: () => ('')
    },
    acceptancePrice: {
      type: Number,
      default: () => 0
    }
  },
  emits: ['update:name', 'update:bio', 'update:avatar', 'update:acceptancePrice'],
  data () {
    return {
      splitterSize: 110,
      internalAvatar: this.avatar,
      internalBio: this.bio,
      internalName: this.name,
      internalAcceptancePrice: this.acceptancePrice,
      avatarPath: null,
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
        this.internalAvatar = dataUrl
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
        this.internalAvatar = reader.result
      }
    }
  },
  watch: {
    internalName (value) {
      this.$emit('update:name', value)
    },
    internalBio (value) {
      this.$emit('update:bio', value)
    },
    internalAvatar (value) {
      this.$emit('update:avatar', this.parseImage(value))
    },
    internalAcceptancePrice (value) {
      this.$emit('update:acceptancePrice', value)
    }
  },
  created () {
    if (!this.avatar) {
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    }
  }
}
</script>
