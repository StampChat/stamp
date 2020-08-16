<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">
        {{ $t('seedPhraseDialog.seedPhrase') }}
      </div>
    </q-card-section>

    <q-card-section>
      <q-input
        autogrow
        class="text-bold text-h6"
        v-model="getSeedPhrase"
        filled
        readonly
      />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('seedPhraseDialog.close')"
        color="primary"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: {
    address: {
      type: String,
      default: () => ''
    },
    name: {
      type: String,
      default: () => ''
    }
  },
  computed: {
    ...mapGetters({
      getSeedPhrase: 'wallet/getSeedPhrase'
    })
  }
}
</script>
