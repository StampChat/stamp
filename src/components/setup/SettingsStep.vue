<template>
  <div>
    <q-splitter
      :value=110
      unit="px"
      disable
    >
      <template v-slot:before>
        <q-tabs
          v-model="settingsTab"
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
          <q-tab
            name="appearance"
            icon="wallpaper"
            label="Appearance"
          />
          <q-tab
            name="security"
            icon="fingerprint"
            label="Security"
          />
        </q-tabs>
      </template>
      <template v-slot:after>
        <q-tab-panels
          v-model="settingsTab"
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
              <div class="col">
                <div class="row q-pa-md">
                  <q-select
                    outlined
                    v-model="relayUrl"
                    use-input
                    hide-selected
                    fill-input
                    new-value-mode="add"
                    input-debounce="0"
                    label="Relay URL *"
                    :options="options"
                    @filter="filterRelayFn"
                    style="width:100%"
                  >
                    <template v-slot:no-option>
                      <q-item>
                        <q-item-section class="text-grey">
                          No results
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
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
import { defaultAcceptancePrice, defaultRelayUrl, relayUrlOptions } from '../../utils/constants'

export default {
  data () {
    return {
      acceptancePrice: defaultAcceptancePrice,
      settingsTab: 'inbox',
      relayUrl: defaultRelayUrl,
      options: []
    }
  },
  methods: {
    filterRelayFn (val, update) {
      if (val === '') {
        update(() => {
          this.options = relayUrlOptions
        })
        return
      }

      update(() => {
        const needle = val.toLowerCase()
        this.options = relayUrlOptions.filter(v => v.toLowerCase().indexOf(needle) > -1)
      })
    }
  },
  computed: {
    constructSettings () {
      if (this.relayUrl === null || this.acceptancePrice === '') {
        return null
      } else {
        return {
          relayUrl: this.relayUrl,
          acceptancePrice: this.acceptancePrice
        }
      }
    }
  },
  watch: {
    relayUrl (newUrl, oldUrl) {
      this.$emit('settings', this.constructSettings)
    },
    acceptancePrice (newPrice, oldPrice) {
      this.$emit('settings', this.constructSettings)
    }
  }
}
</script>
