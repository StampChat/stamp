<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <!-- New contact dialog -->
    <q-dialog v-model="seedPhraseOpen">
      <seed-phrase-dialog />
    </q-dialog>

    <q-card-section>
      <div class="text-h6">Wallet Status</div>
    </q-card-section>
    <q-card-section>
      <div class="text-bold text-subtitle1 text-center"> {{getBalance}}</div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <div class="row">
        <qrcode
          class="fit"
          :value="currentAddress"
        ></qrcode>
      </div>
      <div class="row">
        <q-input
          class="fit"
          filled
          auto-grow
          v-model="currentAddress"
          readonly
        >
          <template v-slot:after>
            <q-btn
              dense
              color="primary"
              flat
              icon="content_copy"
              @click="copyAddress"
            />
            <q-btn
              dense
              color="primary"
              flat
              icon="refresh"
              @click="nextAddress"
            />
          </template>
        </q-input>
      </div>
    </q-card-section>
    <q-separator />
    <q-item-section>
      <q-btn
        color="primary"
        @click="seedPhraseOpen = true"
      > Show Seed </q-btn>
    </q-item-section>
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
import Vue from 'vue'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import SeedPhraseDialog from './SeedPhraseDialog.vue'
import { mapGetters } from 'vuex'
import formatting from '../../utils/formatting'
import { numAddresses } from '../../utils/constants'
import { copyToClipboard } from 'quasar'

Vue.component(VueQrcode.name, VueQrcode)

export default {
  components: {
    SeedPhraseDialog
  },
  data () {
    return {
      currentAddress: this.generatePrivKey()(0).toAddress('testnet'), // TODO: Generic over network
      paymentAddrCounter: 0,
      seedPhraseOpen: false
    }
  },
  computed: {
    ...mapGetters({
      getBalanceVuex: 'wallet/getBalance'
    }),
    getBalance () {
      return formatting.formatBalance(this.getBalanceVuex)
    }
  },
  methods: {
    ...mapGetters({ generatePrivKey: 'wallet/generatePrivKey' }),
    copyAddress () {
      copyToClipboard(this.currentAddress).then(() => {
        this.$q.notify({
          message: '<div class="text-center"> Address copied to clipboard </div>',
          html: true,
          color: 'purple'
        })
      })
        .catch(() => {
          // fail
        })
    },
    nextAddress () {
      // Increment address
      this.paymentAddrCounter = (this.paymentAddrCounter + 1) % numAddresses
      let privKey = this.generatePrivKey()(this.paymentAddrCounter)
      this.currentAddress = privKey.toAddress('testnet')
    }
  }
}
</script>
