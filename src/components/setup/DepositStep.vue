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
    <q-btn class="center" label="Get Free Lotus" @click="openFaucet" />
    <q-input class="fit" filled auto-grow v-model="displayAddress" readonly>
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
    <span class="row q-mx-sm q-px-none"
      >Current: {{ formatBalance }}, Need: {{ formatRecommended }}</span
    >
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { copyToClipboard } from 'quasar'

import { recomendedBalance } from '../../utils/constants'
import { addressCopiedNotify } from '../../utils/notifications'
import { formatBalance } from '../../utils/formatting'
import { toAPIAddress, toDisplayAddress } from '../../utils/address'
import { useWalletStore } from 'src/stores/wallet'

export default defineComponent({
  components: {
    QrcodeVue,
  },
  setup() {
    const walletStore = useWalletStore()

    return {
      balance: computed(() => walletStore.balance),
    }
  },
  data() {
    return {
      paymentAddrCounter: 0,
      qrSize: 300,
      legacy: false as boolean,
    }
  },
  methods: {
    toggleLegacy() {
      this.legacy = !this.legacy
    },
    copyAddress() {
      copyToClipboard(this.displayAddress)
        .then(() => {
          addressCopiedNotify()
        })
        .catch(() => {
          // fail
        })
    },
    setQRSize(size: { height: number; width: number }) {
      this.qrSize = size.height
    },
    openFaucet() {
      if (!this.$wallet.myAddress) {
        return
      }
      this.openURL(
        `https://faucet.lotuslounge.org/?address=${toDisplayAddress(
          this.$wallet.myAddress?.toXAddress(),
        )}`,
      )
    },
  },
  computed: {
    displayAddress(): string {
      if (!this.$wallet.myAddress) {
        return 'Error'
      }
      return this.legacy
        ? toAPIAddress(this.$wallet.myAddress)
        : toDisplayAddress(this.$wallet.myAddress)
    },
    percentageBalance(): number {
      const percentage = this.balance / recomendedBalance
      return percentage
    },
    formatRecommended(): string {
      return formatBalance(recomendedBalance)
    },
    formatBalance(): string {
      return formatBalance(this.balance)
    },
  },
})
</script>
