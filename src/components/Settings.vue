<template>
  <div>
    <q-splitter :value="110" unit="px" disable>
      <template #before>
        <q-tabs v-model="tab" vertical class="text-primary">
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
                style="width: 100%"
                ref="contactRefreshInterval"
              />
            </div>
          </q-tab-panel>
          <q-tab-panel name="appearance">
            <div class="row">
              <q-toggle :label="$t('settings.darkMode')" v-model="darkMode" />
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue'

import { defaultUpdateInterval } from 'src/utils/constants'
import { QInput } from 'quasar'

interface ModelValueType {
  appearance: { darkMode: boolean }
  networking: { updateInterval: number }
}

export default defineComponent({
  setup() {
    return { contactRefreshInterval: ref<QInput | null>(null) }
  },
  props: {
    modelValue: {
      type: Object as PropType<ModelValueType>,
      default: () => ({
        apperance: { darkMode: false },
        networking: { updateInterval: defaultUpdateInterval },
      }),
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      tab: 'networking',
      darkMode: this.modelValue.appearance.darkMode,
      updateInterval: this.modelValue.networking.updateInterval,
    }
  },
  computed: {
    constructSettings() {
      return {
        networking: {
          updateInterval: this.updateInterval,
        },
        appearance: {
          darkMode: this.darkMode,
        },
      }
    },
  },
  watch: {
    updateInterval() {
      this.$emit('update:modelValue', this.constructSettings)
    },
    darkMode() {
      this.$emit('update:modelValue', this.constructSettings)
    },
  },
  mounted() {
    this.contactRefreshInterval?.$el.focus()
  },
})
</script>
