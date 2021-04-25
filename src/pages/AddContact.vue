<template>
  <q-card class="q-ma-sm">
    <q-card-section>
      <div class="text-h6">
        {{ $t('newContactDialog.newContact') }}
      </div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="address"
        filled
        dense
        :placeholder="$t('newContactDialog.enterBitcoinCashAddress')"
        ref="address"
        @keydown.enter.prevent="addContact()"
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
            <q-item-label>{{ $t('newContactDialog.notFound') }}</q-item-label>
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
                :src="contact.profile.avatar"
                size="xl"
              >
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ contact.profile.name }}</q-item-label>
            <q-item-label caption>
              {{ $t('newContactDialog.minimumStamp') }}: {{ contact.inbox.acceptancePrice }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-card-section>
    </q-slide-transition>
    <q-card-actions align="right">
      <q-btn
        :disable="contact === null"
        label="Add"
        color="primary"
        @click="addContact()"
      />
      <q-btn
        label="Cancel"
        color="negative"
        @click="cancel"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapActions } from 'vuex'
import { KeyserverHandler } from '../cashweb/keyserver/handler'
import { toAPIAddress } from '../utils/address'
import { keyservers, networkName } from '../utils/constants'

export default {
  data () {
    return {
      address: '',
      contact: null
    }
  },
  watch: {
    address: async function (newAddress) {
      if (newAddress === '') {
        this.contact = null
        return
      }
      this.contact = 'loading'
      try {
        // Validate address
        const address = toAPIAddress(newAddress.trim()) // TODO: Make generic

        // Pull information from keyserver then relay server
        const ksHandler = new KeyserverHandler({ keyservers, networkName })
        const relayURL = await ksHandler.getRelayUrl(address)
        const relayData = await this.$relayClient.getRelayData(address)
        relayData.notify = true
        this.contact = relayData
        this.contact.relayURL = relayURL
      } catch {
        this.contact = null
      }
    }
  },
  methods: {
    ...mapActions({
      addContactVuex: 'contacts/addContact'
    }),
    addContact () {
      const cashAddress = toAPIAddress(this.address) // TODO: Make generic
      this.addContactVuex({ address: cashAddress, contact: this.contact })
      this.$router.replace(`/chat/${cashAddress}`)
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
