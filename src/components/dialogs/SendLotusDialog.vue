<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">
        Send Lotus to {{ contact.name }}
      </div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="amount"
        type="number"
        filled
        dense
        hint="Set the amount of Lotus to be sent."
        placeholder="Enter number of Lotus..."
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
  props: {
    address: {
      type: String,
      default: () => ''
    },
    contact: {
      type: Object,
      default: () => ({ name: 'Unknown' })
    }
  },
  methods: {
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount'
    }),
    async sendStealthPayment () {
      const stampAmount = this.getStampAmount()(this.address)
      const amount = Number(this.amount * 1000000)
      await this.$relayClient.sendStealthPayment({ address: this.address, amount, memo: this.memo, stampAmount })
    }
  },
  mounted () {
    this.$refs.amount.$el.focus()
  }
}
</script>