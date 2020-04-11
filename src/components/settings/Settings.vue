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
            icon="wallpaper"
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
          <q-tab-panel name="appearance">
            <brand-color-picker />
          </q-tab-panel>
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
        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script>
import BrandColorPicker from '../settings/BrandColorPicker'

export default {
  components: {
    BrandColorPicker
  },
  props: {
    value: {
      type: Object
    }
  },
  data () {
    return {
      tab: 'networking',
      updateInterval: this.value.networking.updateInterval
    }
  },
  computed: {
    constructSettings () {
      return {
        networking: {
          updateInterval: this.updateInterval
        }
      }
    }
  },
  watch: {
    updateInterval (newInterval, oldInterval) {
      this.$emit('input', this.constructSettings)
    }
  }
}
</script>
