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
        </q-tabs>
          <q-tabs
          v-model="tab"
          vertical
          class="text-primary"
        >
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
            <div class="row">
              <q-toggle
                :label="`Dark Mode`"
                v-model="darkMode"
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
      type: Object
    }
  },
  data () {
    return {
      tab: 'networking',
      darkMode: this.value.appearance.darkMode,
      updateInterval: this.value.networking.updateInterval
    }
  },
  computed: {
    constructSettings () {
      return {
        networking: {
          updateInterval: this.updateInterval
        },
        appearance: {
          darkMode: this.darkMode
        }
      }
    }
  },
  watch: {
    updateInterval (newInterval, oldInterval) {
      this.$emit('input', this.constructSettings)
    },
    darkMode (newDarkMode, oldDarkMode) {
      this.$emit('input', this.constructSettings)
    }
  }
}
</script>
