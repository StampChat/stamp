<template>
  <q-card class="q-ma-sm">
    <!-- New contact dialog -->
    <q-dialog v-model="seedPhraseOpen">
      <seed-phrase-dialog />
    </q-dialog>

    <q-card-section>
      <div class="text-h6">{{ $t('receiveBitcoinDialog.walletStatus') }}</div>
    </q-card-section>
    <q-card-section>
      <div class="text-bold text-subtitle1 text-center">
        {{ formattedBalance }}
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <div class="row">
        <qrcode-vue
          style="margin-left: auto; margin-right: auto"
          :value="displayAddress"
          :size="300"
          level="H"
        />
      </div>
      <div class="row">
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
      </div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn color="warning" @click="seedPhraseOpen = true">
        {{ $t('receiveBitcoinDialog.showSeed') }}
      </q-btn>
      <q-btn
        :label="$t('receiveBitcoinDialog.close')"
        color="primary"
        @click="close"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'

import QrcodeVue from 'qrcode.vue'
import SeedPhraseDialog from '../components/dialogs/SeedPhraseDialog.vue'
import { formatBalance } from '../utils/formatting'
import { copyToClipboard } from 'quasar'
import { useWalletStore } from 'src/stores/wallet'

export default defineComponent({
  setup() {
    const wallet = useWalletStore()
    return {
      formattedBalance: computed(() => {
        return formatBalance(wallet.balance)
      }),
    }
  },
  components: {
    SeedPhraseDialog,
    QrcodeVue,
  },
  data() {
    return {
      seedPhraseOpen: false as boolean,
      legacy: false as boolean,
    }
  },
  methods: {
    toggleLegacy() {
      this.legacy = !this.legacy
    },
    copyAddress() {
      if (!this.displayAddress) {
        return
      }
      copyToClipboard(this.displayAddress)
        .then(() => {
          this.$q.notify({
            message: `<div class="text-center">${this.$t(
              'receiveBitcoinDialog.addressCopied',
            )}</div>`,
            html: true,
            color: 'purple',
          })
        })
        .catch(() => {
          // fail
        })
    },
    close() {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
  },
  computed: {
    displayAddress(): string | undefined {
      return this.legacy
        ? this.$wallet.myAddress?.toXAddress()
        : this.$wallet.displayAddress
    },
  },
})
</script>
