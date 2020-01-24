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
import { defaultAcceptancePrice, defaultRelayUrl } from '../../utils/constants'
const relayUrlOptions = ['34.67.137.105:8080', 'bitcoin.com', 'cashweb.io']

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
