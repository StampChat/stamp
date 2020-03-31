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
            name="appearance"
            icon="wallpaper"
            label="Appearance"
          />
          <q-tab
            name="networking"
            icon="cloud"
            label="Networking"
          />
          <q-tab
            name="security"
            icon="fingerprint"
            label="Security"
          />
          <q-tab
            name="backup"
            icon="settings_backup_restore"
            label="Backup"
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
      tab: 'appearance',
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
