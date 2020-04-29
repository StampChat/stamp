<template>
  <div class="col q-gutter-y-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> How to deposit? </div>
      </q-card-section>
      <q-card-section class="text-body2">
        The Stamp protocol requires that you attach a small payment to every message. <br><br>

        The wallet will handle this automatically, but first you must deposit some Bitcoin into the wallet.
        Do this by sending Bitcoin Cash to the <strong>deposit address</strong> below. <br><br>

        No Bitcoin Cash? Click the faucet below!
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" flat @click="openFaucet">bitcoin.com faucet</q-btn>
      </q-card-actions>
    </q-card>
    <div class="row q-gutter-x-md">
      <!-- Deposit card -->
      <q-card class="col">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> Deposit Addresses </div>
      </q-card-section>
        <q-card-section class="row">
          <qrcode-vue
            style="margin-left: auto; margin-right: auto;"
            :value="currentAddress"
            :size="qrHeight"
            level="H"
          ></qrcode-vue>
        </q-card-section>

        <q-card-section class="row">
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
        </q-card-section>
      </q-card>

      <!-- Balance Card -->
      <q-card class="col">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> Current Balance </div>
      </q-card-section>
        <q-card-section class="row">
          <q-circular-progress
            style="margin-left: auto; margin-right: auto;"
            show-value
            :value="percentageBalance"
            size="18.5vw"
            :thickness="0.25"
            color="green"
            track-color="grey"
          >
            <q-resize-observer @resize="setQrHeight" />
            <span class="text-h5">{{ formatBalance }}</span>
          </q-circular-progress>
        </q-card-section>
        <q-card-section class="row">
          <span class="row text-subtitle1" style="margin-left: auto; margin-right: auto;">
            Recommended {{ recomendedBalance }} satoshi
          </span>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>
import QrcodeVue from 'qrcode.vue'
import { copyToClipboard } from 'quasar'
import { numAddresses, recomendedBalance } from '../../utils/constants'
import { addressCopiedNotify } from '../../utils/notifications'
import formatting from '../../utils/formatting'

export default {
  components: {
    QrcodeVue
  },
  data () {
    return {
      currentAddress: this.$wallet.privKeys[0].toAddress('testnet').toString(), // TODO: Generic over network
      paymentAddrCounter: 0,
      recomendedBalance,
      qrHeight: 300
    }
  },
  methods: {
    copyAddress () {
      copyToClipboard(this.currentAddress).then(() => {
        addressCopiedNotify()
      })
        .catch(() => {
          // fail
        })
    },
    nextAddress () {
      // Increment address
      this.paymentAddrCounter = (this.paymentAddrCounter + 1) % numAddresses
      let privKey = this.$wallet.privKeys[this.paymentAddrCounter]
      this.currentAddress = privKey.toAddress('testnet').toString() // TODO: Make generic
      console.log(this.currentAddress)
    },
    getBalance () {
      return this.$wallet.balance
    },
    openFaucet () {
      const shell = require('electron').shell
      event.preventDefault()
      shell.openExternal('https://developer.bitcoin.com/faucets/bch/')
    },
    setQrHeight (size) {
      this.qrHeight = size.height
    }
  },
  computed: {
    percentageBalance () {
      let percentage = 100 * Math.min(this.getBalance() / this.recomendedBalance, 1)
      return percentage
    },
    formatBalance () {
      return formatting.formatBalance(this.getBalance())
    }
  }
}
</script>
