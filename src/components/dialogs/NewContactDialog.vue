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
        v-if="(contact === null) && address !== ''"
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
        v-else-if="contact === 'loading'"
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
        v-else-if="contact !== null"
        class="q-py-none"
      >
        <q-item>
          <q-item-section avatar>
            <q-avatar rounded>
              <img
                :src="contact.keyserver.avatar"
                size="xl"
              >
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{contact.keyserver.name}}</q-item-label>
            <q-item-label caption>Inbox Fee: {{contact.relay.acceptancePrice}}</q-item-label>
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
        :disable="contact === null"
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
      contact: null
    }
  },
  watch: {
    address: async function (newAddress, oldAddress) {
      if (newAddress === '') {
        this.contact = null
        return
      }
      this.contact = 'loading'
      try {
        let ksHandler = this.getKsHandler()
        let relayClient = this.getRelayClient()
        let keyserver = await ksHandler.getContact(newAddress)
        let relay = {
          acceptancePrice: await relayClient.getAcceptancePrice(newAddress)
        }
        this.contact = {
          keyserver,
          relay,
          notify: true
        }
      } catch {
        this.contact = null
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
      let cashAddress = cashlib.Address.fromString(this.address, 'testnet').toCashAddress() // TODO: Make generic
      this.addContactVuex({ addr: cashAddress, contact: this.contact })
    }
  }
}
</script>
