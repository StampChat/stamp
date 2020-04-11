<template>
  <q-card style="min-width: 50%">
    <q-card-section>
      <div class="text-h6">{{title}}</div>
    </q-card-section>
    <q-card-section>
      <q-tabs
        v-if="outpoints.length !== 1"
        v-model="outpoint"
        class="text-primary"
      >
        <q-tab v-for="n in outpoints.length"  :key="n" :name="n" :label="n"/>
      </q-tabs>
      <q-tab-panel v-for="n in outpoints.length" :key="n" :name="n">
        <q-item-section class='q-py-lg'>
          <q-item-label>{{outpoints[n-1].stampTx.hash}}</q-item-label>
          <q-item-label caption>Transaction ID</q-item-label>
        </q-item-section>
        <q-item-section>
          <span class='text-bold'> Inputs </span>
          <q-list>
            <q-item v-for="(input, index) in outpoints[n-1].stampTx.inputs" :key="index">
              <q-item-section>
                <span class='text-bold'> Previous Transaction ID </span>
                {{ input.prevTxId }}
                <span class='text-bold'> Output Index </span>
                {{ input.outputIndex }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-item-section>
        <q-item-section>
          <span class='text-bold'> Outputs </span>
          <q-list>
            <q-item v-for="(output, index) in outpoints[n-1].stampTx.outputs" :key="index">
              <q-item-section>
                <span class='text-bold'> Address </span>
                {{ extractAddress(output) }}
                <span class='text-bold'> Amount </span>
                {{ output.satoshis }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-item-section>
      </q-tab-panel>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        label="Close"
        color="primary"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
const cashlib = require('bitcore-lib-cash')

export default {
  props: ['title', 'outpoints'],
  data () {
    return {
      outpoint: 1
    }
  },
  methods: {
    extractAddress (output) {
      const script = new cashlib.Script(output.script)
      if (script.isPublicKeyHashOut()) {
        return script.toAddress('testnet') // TODO: Make generic
      }
      return 'Non-p2pkh'
    }
  }
}
</script>
