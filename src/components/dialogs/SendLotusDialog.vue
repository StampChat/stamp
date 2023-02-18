<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">
        {{ $t('sendLotusDialog.sendLotusTo') + ' ' + contact.name }}
      </div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="amount"
        type="number"
        filled
        dense
        :hint="$t('sendLotusDialog.amountHint')"
        :placeholder="$t('sendLotusDialog.amountPlaceholder')"
        ref="amount"
      />
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="memo"
        filled
        dense
        :hint="$t('sendLotusDialog.memoHint')"
        :placeholder="$t('sendLotusDialog.memoPlaceholder')"
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('sendLotusDialog.cancelBtnLabel')"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :disable="amount == ''"
        :label="$t('sendLotusDialog.sendBtnLabel')"
        color="primary"
        v-close-popup
        @click="sendStealthPayment()"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { QInput } from 'quasar'
import { useChatStore } from 'src/stores/chats'
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    return {
      getStampAmount: chatStore.getStampAmount,
    }
  },
  data() {
    return {
      amount: 0,
      memo: '',
    }
  },
  props: {
    address: {
      type: String,
      default: () => '',
    },
    contact: {
      type: Object,
      default: () => ({ name: 'Unknown' }),
    },
  },
  methods: {
    async sendStealthPayment() {
      const stampAmount = this.getStampAmount(this.address)
      const amount = Number(this.amount * 1000000)
      await this.$relayClient.sendStealthPayment({
        address: this.address,
        amount,
        memo: this.memo,
        stampAmount,
      })
    },
  },
  mounted() {
    const amountInput = this.$refs.amount as QInput
    amountInput.$el.focus()
  },
})
</script>
