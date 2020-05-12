<template>
  <div class="col q-gutter-y-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> What is a Relay Server? </div>
      </q-card-section>
      <q-card-section  class="text-body2">
        Relay servers <strong>store and process</strong> your messages - this allows friends to send to you while you're offline. Think of your relay server as a replacement to Gmail, the difference is that a relay server can <strong>never</strong> read your mail! <br> <br>

        In order to proceed you must pick a relay server from the list below. <br> <br>

        Don't like any of the servers in the list? Are you a techie? Then click below to run your own server!
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" flat @click="openCashRelay">Run my own server</q-btn>
      </q-card-actions>
    </q-card>
    <q-card >
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> Select a Relay Server </div>
      </q-card-section>
      <q-card-section>
        <q-select
          outlined
          v-model="innerRelayUrl"
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
      </q-card-section>
    </q-card>

  </div>
</template>

<script>
import { defaultAcceptancePrice, relayUrlOptions } from '../../utils/constants'

export default {
  model: {
    prop: 'relayUrl',
    event: 'input'
  },
  props: {
    relayUrl: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      relayUrls: relayUrlOptions,
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
    },
    openCashRelay () {
      const shell = require('electron').shell
      event.preventDefault()
      shell.openExternal('https://github.com/cashweb/cash-relay')
    }
  },
  computed: {
    innerRelayUrl: {
      get () {
        return this.relayUrl
      },
      set (val) {
        this.$emit('input', val)
      }
    }
  }
}
</script>
