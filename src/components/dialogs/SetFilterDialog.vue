<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">Set Filter</div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="price"
        type="number"
        filled
        dense
        hint="Set the minimal price for inbox acceptance (satoshis)."
        placeholder="Enter acceptance price..."
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
        :disable="price==''"
        label="Set"
        color="primary"
        @click="setFilters()"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import relayConstructors from '../../relay/constructors'
import { mapGetters, mapActions } from 'vuex'
import { relayDisconnectedNotify } from '../../utils/notifications'

export default {
  data () {
    return {
      price: this.oldPrice
    }
  },
  props: ['oldPrice'],
  methods: {
    ...mapActions({
      setAcceptancePrice: 'myProfile/setAcceptancePrice'
    }),
    ...mapGetters({
      getIdentityPrivKey: 'wallet/getIdentityPrivKey',
      getMyAddress: 'wallet/getMyAddress',
      getRelayToken: 'relayClient/getToken',
      getRelayClient: 'relayClient/getClient'
    }),
    async setFilters () {
      // Get identity address
      let idAddress = this.getMyAddress()

      // Get relay token
      let token = this.getRelayToken()

      // Get identity privKey
      let privKey = this.getIdentityPrivKey()

      // Create filter application
      let filterApplication = relayConstructors.constructPriceFilterApplication(true, this.price, this.price, privKey)

      // Apply remotely
      let client = this.getRelayClient()
      try {
        await client.applyFilter(idAddress.toLegacyAddress(), filterApplication, token)
      } catch (err) {
        relayDisconnectedNotify()
        return
      }

      // Apply locally
      this.setAcceptancePrice(this.price)
    }
  }
}
</script>
