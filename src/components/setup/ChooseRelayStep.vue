<template>
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
</template>

<script>
import { defaultAcceptancePrice, defaultRelayUrl, relayUrlOptions } from '../../utils/constants'

export default {
  data () {
    return {
      acceptancePrice: defaultAcceptancePrice,
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
  watch: {
    relayUrl (newUrl, oldUrl) {
      this.$emit('relayUrl', this.relayUrl)
    }
  }
}
</script>
