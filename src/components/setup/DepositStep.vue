<template>
  <div class="col q-gutter-y-md">
    <q-resize-observer @resize="setQRSize" />
    <div class="p-mx-sm">
      <qrcode-vue
        class="text-center"
        :value="displayAddress"
        level="H"
        size="300"
      />
    </div>

    <q-input
      class="fit q-px-lg"
      filled
      auto-grow
      v-model="displayAddress"
      readonly
    >
      <template v-slot:after>
        <q-btn
          dense
          color="primary"
          flat
          icon="swap_vert"
          @click="toggleLegacy"
        />
        <q-btn
          dense
          color="primary"
          flat
          icon="content_copy"
          @click="copyAddress"
        />
      </template>
    </q-input>

    <q-linear-progress
      show-value
      stripe
      rounded
      size="20px"
      :value="percentageBalance"
      color="warning"
      class="q-mt-sm"
    />
    <span class="row q-mx-sm q-px-none">Current: {{ formatBalance }}, Need: {{ formatRecommended }}</span>
  </div>
</template>

<script>
import QrcodeVue from 'qrcode.vue'
import { copyToClipboard } from 'quasar'
import { mapGetters } from 'vuex'
import { recomendedBalance } from '../../utils/constants'
import { addressCopiedNotify } from '../../utils/notifications'
import { formatBalance } from '../../utils/formatting'

export default {
  components: {
    QrcodeVue
  },
  data () {
    return {
      paymentAddrCounter: 0,
      recomendedBalance,
      qrSize: 300,
      legacy: false
    }
  },
  methods: {
    toggleLegacy () {
      this.legacy = !this.legacy
    },
    copyAddress () {
      copyToClipboard(this.displayAddress)
        .then(() => {
          addressCopiedNotify()
        })
        .catch(() => {
          // fail
        })
    },
    openFaucet () {
      event.preventDefault()
      this.openURL('https://developer.bitcoin.com/faucets/bch/')
    },
    setQRSize (size) {
      this.qrSize = size.height
    }
  },
  computed: {
    ...mapGetters({ balance: 'wallet/balance' }),
    displayAddress () {
      return this.legacy ? this.$wallet.myAddressStr : this.$wallet.displayAddress
    },
    percentageBalance () {
      const percentage = this.balance / this.recomendedBalance
      return percentage
    },
    formatRecommended () {
      return formatBalance(this.recomendedBalance)
    },
    formatBalance () {
      return formatBalance(this.balance)
    }
  }
}
</script>
