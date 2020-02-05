<template>
  <q-card style="min-width: 50%">
    <q-card-section>
      <div class="text-h6">Seed Phrase</div>
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
        label="Close"
        color="primary"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: ['address', 'name'],
  computed: {
    ...mapGetters({
      getSeedPhrase: 'wallet/getSeedPhrase'
    })
  }
}
</script>
