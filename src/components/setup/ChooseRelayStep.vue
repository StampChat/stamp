<template>
  <div class="row q-pa-md">
    <q-select
      outlined
      v-model="relayUrl"
      use-input
      hide-selected
      fill-input
      new-value-mode="add"
      @new-value="createValue"
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
import { defaultAcceptancePrice, relayUrlOptions } from '../../utils/constants'

export default {
  props: {
    // This is the relay URL
    value: {
      type: String
    }
  },
  data () {
    return {
      relayUrls: relayUrlOptions,
      relayUrl: this.value,
      acceptancePrice: defaultAcceptancePrice,
      options: []
    }
  },
  methods: {
    createValue (val, done) {
      this.relayUrls.push(val)
      done(val)
    },
    filterRelayFn (val, update) {
      if (val === '') {
        update(() => {
          this.options = this.relayUrls
        })
        return
      }

      update(() => {
        const needle = val.toLowerCase()
        this.options = this.relayUrls.filter(v => v.toLowerCase().indexOf(needle) > -1)
      })
    }
  },
  watch: {
    relayURL (newUrl, oldUrl) {
      this.$emit('input', this.relayURL)
    }
  }
}
</script>
