<template>
  <q-card class="q-ma-sm">
    <q-card-section>
      <div class="text-h6">
        {{ $t('sendAddressDialog.sendToAddress') }}
      </div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="address"
        filled
        dense
        :placeholder="$t('sendAddressDialog.enterBitcoinCashAddress')"
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
        :placeholder="$t('sendAddressDialog.enterAmount')"
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        :label="$t('sendAddressDialog.cancel')"
        color="negative"
        @click="cancel"
      />
      <q-btn
        :disable="!isValid"
        :label="$t('sendAddressDialog.send')"
        color="primary"
        @click="send()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { Address } from 'bitcore-lib-xpi'

import { sentTransactionNotify, errorNotify } from '../utils/notifications'
import { displayNetwork, networkName } from '../utils/constants'

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
      for (const networkString of [displayNetwork, networkName]) {
        try {
          Address(this.address, networkString) // TODO: Make this generic
          return true
        } catch (err) {
          console.log(`Address not for ${networkString}`)
        }
      }
      return false
    }
  },
  methods: {
    async send () {
      try {
        const satoshiAmount = Number(this.amount * 1000000)
        await this.$relayClient.sendToPubKeyHash({ address: this.address, amount: satoshiAmount })
        sentTransactionNotify()
      } catch (err) {
        console.error(err)
        errorNotify(new Error('Failed to send transaction'))
        // Unfreeze UTXOs if stealth tx broadcast fails
      } finally {
        window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
      }
    },
    cancel () {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    }
  },
  mounted () {
    this.$refs.address.$el.focus()
  }
}
</script>
