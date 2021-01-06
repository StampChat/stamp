<template>
  <div class="col q-gutter-y-md">
    <q-resize-observer @resize="setQRSize" />
    <div class="p-mx-sm">
      <qrcode-vue
        class="text-center"
        :value="identityAddress"
        level="H"
        size="300"
      />
    </div>

    <q-input
      class="fit q-px-lg"
      filled
      auto-grow
      v-model="identityAddress"
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
    <span class="text-h5">{{ formatBalance }}</span>
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
      qrSize: 300
    }
  },
  methods: {
    copyAddress () {
      copyToClipboard(this.identityAddress)
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
    identityAddress () {
      return this.$wallet.myAddress.toString()
    },
    percentageBalance () {
      const percentage = this.balance / this.recomendedBalance
      return percentage
    },
    formatBalance () {
      return formatBalance(this.balance)
    }
  }
}
</script>
