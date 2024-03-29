<template>
  <q-page-container>
    <q-page class="q-ma-none q-pa-sm">
      <q-card>
        <q-card-section>
          <div class="text-h6">{{ $t('newContactDialog.newContact') }}</div>
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
            v-if="contact === null && address !== ''"
          >
            <q-item>
              <q-item-section avatar>
                <q-icon color="negative" name="error" size="xl" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{
                  $t('newContactDialog.notFound')
                }}</q-item-label>
                <!-- TODO: Error information here -->
              </q-item-section>
            </q-item>
          </q-card-section>
          <q-card-section class="q-py-none" v-else-if="loading">
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
          <q-card-section v-else-if="contact" class="q-py-none">
            <q-item>
              <q-item-section avatar v-if="contact?.profile?.avatar">
                <q-avatar rounded>
                  <img :src="contact?.profile?.avatar" size="xl" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ contact?.profile?.name }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-card-section>
        </q-slide-transition>
        <q-card-actions align="right">
          <q-btn label="Cancel" color="negative" @click="cancel" />
          <q-btn
            :disable="contact === null"
            label="Add"
            color="primary"
            @click="addContact()"
          />
        </q-card-actions>
      </q-card>
    </q-page>
  </q-page-container>
</template>

<script lang="ts">
import { defineComponent, markRaw, ref } from 'vue'
import { QInput } from 'quasar'

import { ContactState, useContactStore } from 'src/stores/contacts'
import { RegistryHandler } from '../cashweb/registry'
import { toAPIAddress } from '../utils/address'
import { registrys, networkName } from '../utils/constants'
import { PublicKey } from 'bitcore-lib-xpi'
import { openChat } from 'src/utils/routes'

export default defineComponent({
  data() {
    return {
      address: '',
      contact: null as Partial<ContactState> | null,
    }
  },
  setup() {
    const contactStore = useContactStore()

    return {
      addressRef: ref<QInput | null>(null),
      addContactToStore: contactStore.addContact,
    }
  },
  computed: {
    loading(): boolean {
      return this.address !== '' && this.contact === null
    },
  },
  watch: {
    address: async function (newAddress) {
      if (newAddress === '') {
        this.contact = null
        return
      }
      try {
        // Validate address
        const address = toAPIAddress(newAddress.trim()) // TODO: Make generic

        // Pull information from registry then relay server
        const ksHandler = new RegistryHandler({ registrys, networkName })
        const relayURL = await ksHandler.getRelayUrl(address)
        const relayData = await this.$relayClient.getRelayData(address)
        relayData.notify = true
        this.contact = {
          ...relayData,
          profile: {
            ...relayData.profile,
            pubKey: markRaw(PublicKey.fromBuffer(relayData.profile.pubKey)),
          },
        }
        this.contact.relayURL = relayURL ?? null
      } catch {
        this.contact = null
      }
    },
  },
  methods: {
    addContact() {
      if (!this.contact) {
        return
      }
      const cashAddress = toAPIAddress(this.address) // TODO: Make generic
      this.addContactToStore({
        address: cashAddress,
        contact: this.contact,
      })
      openChat(this.$router, this.address)
    },
    cancel() {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
  },
  mounted() {
    this.addressRef?.$el.focus()
  },
})
</script>
