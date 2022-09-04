<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">
        {{ title }}
      </div>
    </q-card-section>
    <q-card-section>
      <q-tabs v-model="tab" class="text-primary">
        <q-tab v-for="n in outpoints.length" :key="n" :name="n" :label="n" />
      </q-tabs>
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel v-for="n in outpoints.length" :key="n" :name="n">
          <q-item-section class="q-py-lg">
            <span class="text-bold"> Transaction ID </span>
            <q-item-label>{{ outpoints[n - 1].txId }}</q-item-label>
            <span class="text-bold"> Type </span>
            <q-item-label>{{ outpoints[n - 1].type }}</q-item-label>
            <span class="text-bold"> Address </span>
            {{ extractAddress(outpoints[n - 1].address) }}
            <span class="text-bold"> Amount </span>
            {{ outpoints[n - 1].satoshis }}
          </q-item-section>
        </q-tab-panel>
      </q-tab-panels>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Close" color="primary" v-close-popup />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { toDisplayAddress } from 'src/utils/address'
import { Utxo } from 'src/cashweb/types/utxo'

export default defineComponent({
  props: {
    title: {
      type: String,
      default: () => '',
    },
    outpoints: {
      type: Object as PropType<Array<Utxo>>,
      default: () => [] as Utxo[],
    },
  },
  data() {
    return {
      outpoint: 1,
      tab: 1,
    }
  },
  methods: {
    extractAddress(outpointAddress: string) {
      return toDisplayAddress(outpointAddress)
    },
  },
})
</script>
