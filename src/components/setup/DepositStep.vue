<template>
  <div class="row">
    <div class="col">
      <div class="row">
        <p
          class="text-h4"
          style="margin: auto; "
        >Deposit Address</p>
      </div>

      <div class="row">
        <qrcode
          style="margin-left: auto; margin-right: auto;"
          :value="currentAddress"
          :options="{width: 300}"
        ></qrcode>
      </div>
      <div class="row">
        <q-input
          class='fit q-px-lg'
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
    </div>
    <q-separator
      vertical
      inset
    />
    <div class="col">
      <div class="row">
        <p
          class="text-h4"
          style="margin: auto; "
        >Current Balance </p>
      </div>

      <div class="row">
        <q-circular-progress
          style="margin-left: auto; margin-right: auto; margin-top: 50px;"
          show-value
          :value="percentageBalance"
          size="225px"
          :thickness="0.25"
          color="green"
          track-color="grey"
        >
          <span class="text-h4">{{ formatBalance }}</span>
        </q-circular-progress>
      </div>
      <div class="row">
        <p
          class="q-pt-lg text-subtitle1"
          style="margin: auto;"
        >Recommended {{ recomendedBalance }} satoshi </p>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import { mapGetters } from 'vuex'
import { copyToClipboard } from 'quasar'
import { numAddresses, recomendedBalance } from '../../utils/constants'
import formatting from '../../utils/formatting'

Vue.component(VueQrcode.name, VueQrcode)

export default {
  data () {
    return {
      currentAddress: this.generatePrivKey()(0).toAddress('testnet'), // TODO: Generic over network
      paymentAddrCounter: 0,
      recomendedBalance
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
  },
  computed: {
    ...mapGetters({ getBalance: 'wallet/getBalance' }),
    percentageBalance () {
      let percentage = 100 * Math.min(this.getBalance / this.recomendedBalance, 1)
      return percentage
    },
    formatBalance () {
      return formatting.formatBalance(this.getBalance)
    }
  }
}
</script>
