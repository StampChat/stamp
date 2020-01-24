<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Wallet Status</div>
    </q-card-section>
    <q-card-section>
      <span class='text-bold'> {{getBalance}} </span>
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
import formatting from '../../utils/formatting'

export default {
  data () {
    return {}
  },
  computed: {
    ...mapGetters({
      getBalanceVuex: 'wallet/getBalance'
    }),
    getBalance () {
      return formatting.formatBalance(this.getBalanceVuex)
    }
  }
}
</script>
