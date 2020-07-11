<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Send Bitcoin to {{ contact.name }}</div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="amount"
        type="number"
        filled
        dense
        hint="Set the amount of Bitcoin to be sent (satoshis)."
        placeholder="Enter number of satoshis..."
        ref="amount"
      />
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="memo"
        filled
        dense
        hint="Attach a memo to the payment."
        placeholder="Enter the memo..."
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
        :disable="amount==''"
        label="Send"
        color="primary"
        v-close-popup
        @click="sendStealthPayment()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  data () {
    return {
      amount: 0,
      memo: ''
    }
  },
  props: ['address', 'contact'],

  methods: {
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount'
    }),
    async sendStealthPayment () {
      const stampAmount = this.getStampAmount()(this.address)
      await this.$relayClient.sendStealthPayment({ address: this.address, amount: Number(this.amount), memo: this.memo, stampAmount })
    }
  },
  mounted () {
    this.$refs.amount.$el.focus()
  }
}
</script>
