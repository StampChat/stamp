<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">New Contact</div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="address"
        filled
        dense
        placeholder="Enter Bitcoin Cash address..."
      />
    </q-card-section>
    <q-slide-transition>
      <q-card-section
        class="q-py-none"
        v-if="(profile === null) && address !== ''"
      >
        <q-item>
          <q-item-section avatar>
            <q-icon
              color="negative"
              name="error"
              size="xl"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Not found</q-item-label>
            <!-- TODO: Error information here -->
          </q-item-section>
        </q-item>
      </q-card-section>
      <q-card-section
        class="q-py-none"
        v-else-if="profile === 'loading'"
      >
        <q-item>
          <q-item-section avatar>
            <q-skeleton type="QAvatar" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              <q-skeleton type="text" />
            </q-item-label>
            <q-item-label caption>
              <q-skeleton type="text" />
            </q-item-label>
          </q-item-section>
        </q-item>

      </q-card-section>
      <q-card-section
        v-else-if="profile !== null"
        class="q-py-none"
      >
        <q-item>
          <q-item-section avatar>
            <q-avatar rounded>
              <img
                :src="profile.avatar"
                size="xl"
              >
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{profile.name}}</q-item-label>
            <q-item-label caption>Inbox Fee: {{profile.acceptancePrice}}</q-item-label>
          </q-item-section>
        </q-item>
      </q-card-section>
    </q-slide-transition>
    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :disable="profile === null"
        label="Add"
        color="primary"
        @click="addContact()"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

const cashlib = require('bitcore-lib-cash')

export default {
  data () {
    return {
      address: '',
      profile: null
    }
  },
  watch: {
    address: async function (newAddress, oldAddress) {
      if (newAddress === '') {
        this.profile = null
        return
      }
      this.profile = 'loading'
      try {
        let ksHandler = this.getKsHandler()
        let relayClient = this.getRelayClient()
        let profile = await ksHandler.getContact(newAddress)
        profile.acceptancePrice = await relayClient.getAcceptancePrice(newAddress)
        this.profile = profile
      } catch {
        this.profile = null
      }
    }
  },
  methods: {
    ...mapActions({
      addContactVuex: 'contacts/addContact'
    }),
    ...mapGetters({
      getKsHandler: 'keyserverHandler/getHandler',
      getRelayClient: 'relayClient/getClient'
    }),
    addContact () {
      this.profile.notify = true
      let cashAddress = cashlib.Address.fromString(this.address, 'testnet').toCashAddress() // TODO: Make generic
      this.addContactVuex({ addr: cashAddress, profile: this.profile })
    }
  }
}
</script>
