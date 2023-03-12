<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">{{ $t('seedPhraseDialog.seedPhrase') }}</div>
    </q-card-section>

    <q-card-section>
      <q-input
        autogrow
        class="text-bold text-h6"
        v-model="seedPhrase"
        filled
        readonly
      />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        icon="file_copy"
        size="sm"
        color="primary"
        @click="copySeed"
      />
      <q-btn flat :label="$t('close')" color="primary" v-close-popup />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { copyToClipboard, useQuasar } from 'quasar'
import { useWalletStore } from 'src/stores/wallet'
import { defineComponent, computed } from 'vue'

export default defineComponent({
  setup() {
    const walletStore = useWalletStore()
    const $q = useQuasar()
    const copySeed = () => {
      if (!walletStore.seedPhrase) {
        return
      }
      copyToClipboard(walletStore.seedPhrase)
        .then(() => {
          $q.notify({
            message:
              '<div class="text-center"> Seed copied to clipboard </div>',
            html: true,
            color: 'purple',
          })
        })
        .catch(() => {
          // fail
        })
    }

    return {
      seedPhrase: computed(() => walletStore.seedPhrase),
      copySeed,
    }
  },
  props: {
    address: {
      type: String,
      default: () => '',
    },
    name: {
      type: String,
      default: () => '',
    },
  },
})
</script>
