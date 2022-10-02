<template>
  <q-page-container>
    <q-page class="q-ma-none q-pa-sm">
      <q-card>
        <q-card-section>
          <div class="text-h6">{{ $t('sendAddressDialog.sendToAddress') }}</div>
        </q-card-section>
        <q-card-section>
          <q-input
            class="text-bold text-h6"
            v-model="address"
            filled
            dense
            :placeholder="$t('sendAddressDialog.enterBitcoinCashAddress')"
            ref="addressControl"
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
    </q-page>
  </q-page-container>
</template>

<script lang="ts">
import assert from 'assert'

import { computed, defineComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { QInput } from 'quasar'

import { Address, Networks } from 'bitcore-lib-xpi'

import { sentTransactionNotify, errorNotify } from '../utils/notifications'
import { displayNetwork, networkName } from '../utils/constants'
import { useRelayClient } from 'src/utils/clients'

export default defineComponent({
  setup() {
    const address = ref('')
    const amount = ref<number | null>(null)
    const addressControl = ref<QInput | null>(null)
    onMounted(() => {
      assert(addressControl.value, 'addressControl not created?')
      addressControl.value.$el.focus()
    })

    const router = useRouter()
    return {
      address,
      addressControl,
      amount,
      isValid: computed(() => {
        if (!amount.value) {
          return false
        }
        for (const networkString of [displayNetwork, networkName]) {
          try {
            new Address(address.value, Networks.get(networkString)) // TODO: Make this generic
            return true
          } catch (err) {
            console.log(`Address not for ${networkString}`)
          }
        }
        return false
      }),
      send: async () => {
        const relayClient = useRelayClient()
        try {
          if (!amount.value) {
            errorNotify({ message: 'No amount specified' })
            return
          }
          const satoshiAmount = Number(amount.value * 1000000)
          relayClient
            .sendToPubKeyHash({
              address: address.value,
              amount: satoshiAmount,
            })
            .then(txIds => {
              const txId = txIds ? txIds[0] : undefined
              if (txId) {
                sentTransactionNotify(txId)

                return
              }
              sentTransactionNotify()
            })
            .catch(err => {
              console.error(err)
              errorNotify(new Error('Failed to send transaction'))
              // Unfreeze UTXOs if stealth tx broadcast fails
              window.history.length > 1 ? router.go(-1) : router.push('/')
            })
        } catch (err) {
          console.error(err)
          errorNotify(new Error('Failed to send transaction'))
        } finally {
          window.history.length > 1 ? router.go(-1) : router.push('/')
        }
      },
      cancel() {
        window.history.length > 1 ? router.go(-1) : router.push('/')
      },
    }
  },
})
</script>
