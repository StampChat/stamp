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
            name="networking"
            icon="cloud"
            label="Networking"
          />
          <q-tab
            name="appearance"
            icon="color_lens"
            label="Appearance"
          />
        </q-tabs>
      </template>
      <template v-slot:after>
        <q-tab-panels
          v-model="tab"
          animated
          swipeable
          vertical
          transition-prev="jump-up"
          transition-next="jump-up"
        >
          <q-tab-panel name="networking">
            <div class="row">
              <q-input
                outlined
                v-model="updateInterval"
                label="Contact Refresh Interval *"
                type="number"
                hint="Interval between contact updates"
                style="width:100%"
              />
          </div>
          </q-tab-panel>
          <q-tab-panel name="appearance">
            <div class="col">
              <q-toggle
                class="row"
                :label="`Dark Mode`"
                v-model="darkMode"
              />
              <q-select
                class="row"
                filled
                v-model="currencyFormat"
                :options="currentFormatOptions"
                label="Current Format"
                emit-value
                map-options
              />
          </div>
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      tab: 'networking',
      darkMode: this.value.appearance.darkMode,
      currencyFormat: this.value.appearance.currencyFormat,
      updateInterval: this.value.networking.updateInterval,
      currentFormatOptions: [
        {
          label: 'Bitcoin',
          value: { type: 'sats' }
        },
        {
          label: 'USD',
          value: { type: 'fiat', conversion: 0.000002 }
        }
      ]
    }
  },
  computed: {
    constructSettings () {
      return {
        networking: {
          updateInterval: this.updateInterval
        },
        appearance: {
          darkMode: this.darkMode,
          currencyFormat: this.currencyFormat
        }
      }
    }
  },
  watch: {
    updateInterval () {
      this.$emit('input', this.constructSettings)
    },
    darkMode () {
      this.$emit('input', this.constructSettings)
    },
    currencyFormat () {
      // console.log(this.currencyFormat)
      this.$emit('input', this.constructSettings)
    }
  }
}
</script>
