<template>
  <div>
    <q-splitter
      :value="110"
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
            name="networking"
            icon="cloud"
            :label="$t('settings.networking')"
          />
          <q-tab
            name="appearance"
            icon="color_lens"
            :label="$t('settings.appearance')"
          />
        </q-tabs>
      </template>
      <template #after>
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
                :label="$t('settings.contactRefreshInterval')"
                type="number"
                :hint="$t('settings.contactRefreshIntervalHint')"
                style="width:100%"
                ref="contactRefreshInterval"
              />
            </div>
          </q-tab-panel>
          <q-tab-panel name="appearance">
            <div class="row">
              <q-toggle
                :label="$t('settings.darkMode')"
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
    modelValue: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue'],
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
    updateInterval () {
      this.$emit('update:modelValue', this.constructSettings)
    },
    darkMode () {
      this.$emit('update:modelValue', this.constructSettings)
    }
  },
  mounted () {
    this.$refs.contactRefreshInterval.$el.focus()
  }
}
</script>
