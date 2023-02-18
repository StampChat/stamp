<template>
  <div>
    <q-splitter v-model="splitterSize" unit="px" disable>
      <template #before>
        <q-tabs v-model="tab" vertical class="text-primary">
          <q-tab
            name="profile"
            icon="person"
            :label="$t('profileDialog.profile')"
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
                    style="width: 100%"
                    :rules="[
                      val =>
                        (val && val.length > 0) || $t('profile.pleaseType'),
                    ]"
                  />
                </div>
                <div class="row q-pa-md">
                  <q-input
                    v-model="internalBio"
                    :label="$t('profile.bio')"
                    :hint="$t('profile.bioHint')"
                    outlined
                    style="width: 100%"
                    autogrow
                  />
                </div>
              </div>
              <div class="col-4 q-pa-md">
                <q-toolbar
                  class="bg-primary text-white shadow-2"
                  style="border-radius: 10px 10px 0px 0px"
                >
                  <q-toolbar-title>{{
                    $t('profile.uploadAvatar')
                  }}</q-toolbar-title>
                  <q-file
                    ref="filePicker"
                    v-model="avatarPath"
                    filled
                    style="display: none"
                  />
                  <q-btn
                    type="file"
                    flat
                    round
                    dense
                    icon="add_a_photo"
                    @click="$refs.filePicker.$el.click()"
                  />
                </q-toolbar>
                <div>
                  <q-img :src="internalAvatar" spinner-color="white" />
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
        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { defaultAvatars } from '../utils/constants'

export default defineComponent({
  setup() {
    return {}
  },
  props: {
    name: {
      type: String,
      default: () => '',
    },
    bio: {
      type: String,
      default: () => '',
    },
    avatar: {
      type: String,
      default: () => '',
    },
    acceptancePrice: {
      type: Number,
      default: () => 0,
    },
  },
  emits: [
    'update:name',
    'update:bio',
    'update:avatar',
    'update:acceptancePrice',
  ],
  data() {
    return {
      splitterSize: 110,
      internalAvatar: this.avatar as string | ArrayBuffer,
      internalBio: this.bio,
      internalName: this.name,
      internalAcceptancePrice: this.acceptancePrice,
      avatarPath: null,
      tab: 'profile',
      defaultAvatarIndex: Math.floor(Math.random() * defaultAvatars.length),
    }
  },
  methods: {
    selectLocalAvatar(name: string) {
      const toDataURL = (callback: (dataUrl: string) => void) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = function (e: Event) {
          const target = e.target as HTMLImageElement
          if (!target) {
            console.error(
              'err finding target in Profile.vue image onload handler',
            )
            return
          }
          const canvas = document.createElement('CANVAS') as HTMLCanvasElement
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return
          }
          canvas.height = target.naturalHeight
          canvas.width = target.naturalWidth
          ctx.drawImage(target, 0, 0)
          const dataURL = canvas.toDataURL()
          callback(dataURL)
        }
        img.src = require(`../assets/avatars/${name}`)
      }
      toDataURL(dataUrl => {
        this.internalAvatar = dataUrl
      })
    },
    cycleAvatarLeft() {
      this.defaultAvatarIndex =
        (this.defaultAvatarIndex - 1 + defaultAvatars.length) %
        defaultAvatars.length
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    },
    cycleAvatarRight() {
      this.defaultAvatarIndex =
        (this.defaultAvatarIndex + 1) % defaultAvatars.length
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    },
  },
  watch: {
    internalName(value) {
      this.$emit('update:name', value)
    },
    internalBio(value) {
      this.$emit('update:bio', value)
    },
    internalAvatar(value) {
      this.$emit('update:avatar', value)
    },
    internalAcceptancePrice(value) {
      this.$emit('update:acceptancePrice', value)
    },
    avatarPath(val) {
      if (val == null) {
        return
      }
      const reader = new FileReader()
      reader.readAsDataURL(val)
      reader.onload = evt => {
        if (!evt.target?.result) {
          return
        }
        this.internalAvatar = evt.target?.result
      }
    },
  },
  created() {
    if (!this.avatar) {
      this.selectLocalAvatar(defaultAvatars[this.defaultAvatarIndex])
    }
  },
})
</script>
