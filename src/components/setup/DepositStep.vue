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
          style="margin-left: auto; margin-right: auto; min-width: 500px"
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
import { mapGetters } from 'vuex'
import { copyToClipboard } from 'quasar'
import { numAddresses, recomendedBalance } from '../../utils/constants'
import formatting from '../../utils/formatting'

export default {
  props: ['xPrivKey'],
  data () {
    return {
      currentAddress: this.generatePrivKey(0).privateKey.toAddress('testnet'), // TODO: Generic over network
      paymentAddrCounter: 0,
      recomendedBalance
    }
  },
  methods: {
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
      let privKey = this.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(this.paymentAddrCounter, true)
      this.currentAddress = privKey.privateKey.toAddress('testnet')
    },
    generatePrivKey (count) {
      return this.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(count, true)
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
