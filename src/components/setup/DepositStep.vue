<template>
  <div class="col q-gutter-y-md">
    <q-resize-observer @resize="setQRSize" />
    <div class="p-mx-none text-">
      <qrcode-vue
        class="center"
        :value="displayAddress"
        level="H"
        :size="150"
      />
    </div>
    <q-btn
      class="center"
      label="Get Free Lotus"
      @click="openFaucet"
    />
    <q-input
      class="fit"
      filled
      auto-grow
      v-model="displayAddress"
      readonly
    >
      <template #after>
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
    setQRSize (size) {
      this.qrSize = size.height
    },
    openFaucet () {
      this.openURL(`https://faucet.lotuslounge.org/?address=${this.$wallet.displayAddress}`)
    }
  },
  computed: {
    ...mapGetters({ balance: 'wallet/balance' }),
    displayAddress () {
      return (this.legacy ? this.$wallet.myAddressStr : this.$wallet.displayAddress)
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
