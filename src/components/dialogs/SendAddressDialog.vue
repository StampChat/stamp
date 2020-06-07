<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Send to Address</div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="address"
        filled
        dense
        placeholder="Enter Bitcoin Cash address..."
        ref="address"
      />
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="amount"
        type="number"
        filled
        dense
        placeholder="Enter amount..."
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :disable="!isValid"
        label="Send"
        color="primary"
        @click="send()"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { sentTransactionNotify, errorNotify } from '../../utils/notifications'

const cashlib = require('bitcore-lib-cash')

export default {
  components: {
  },
  data () {
    return {
      address: '',
      amount: null
    }
  },
  computed: {
    isValid () {
      if (!this.amount) {
        return false
      }
      try {
        cashlib.Address(this.address, 'testnet') // TODO: Make this generic
        return true
      } catch {
        return false
      }
    }
  },
  methods: {
    async send () {
      try {
        const output = new cashlib.Transaction.Output({
          script: cashlib.Script(new cashlib.Address(this.address)),
          satoshis: this.amount
        })

        const { transaction, usedIDs } = this.$wallet.constructTransaction({ outputs: [output], exactOutputs: true })
        const txHex = transaction.toString()

        try {
          const electrumHandler = this.$electrumClient
          await electrumHandler.request('blockchain.transaction.broadcast', txHex)
          sentTransactionNotify()
          console.log('Sent transaction', txHex)
        } catch (err) {
          usedIDs.forEach(id => {
            this.$wallet.unfreezeUTXO(id)
          })
          throw err
        }
      } catch (err) {
        console.error(err)
        errorNotify(new Error('Failed to send transaction'))
        // Unfreeze UTXOs if stealth tx broadcast fails
      }
    }
  },
  mounted() {
    this.$refs.address.$el.focus()
  }
}
</script>
