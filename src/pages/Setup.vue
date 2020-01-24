<template>
  <q-page>
    <div class="q-pa-md">
      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        animated
        alternative-labels
      >
        <q-step
          :name="1"
          title="Welcome"
          icon="settings"
          :done="step > 1"
        >
          <introduction-step />
        </q-step>

        <q-step
          :name="2"
          title="Setup Wallet"
          icon="vpn_key"
          :done="step > 2"
        >
          <seed-step
            v-on:seed="seed = $event"
            v-on:switch="seedType = $event"
          />
        </q-step>

        <q-step
          :name="3"
          title="Deposit Bitcoin Cash"
          icon="attach_money"
          style="min-height: 300px;"
          :done="step > 3"
        >
          <deposit-step :xPrivKey="xPrivKey" />
        </q-step>

        <q-step
          :name="4"
          title="Create a Profile"
          icon="person"
          style="min-height: 300px;"
          :done="step > 4"
        >
          <profile-step v-on:profile="profile = $event" />
        </q-step>
        <q-step
          :name="5"
          title="Settings"
          icon="build"
          style="min-height: 300px;"
        >
          <q-splitter
            :value=110
            unit="px"
            disable
          >
            <template v-slot:before>
              <q-tabs
                v-model="settingsTab"
                vertical
                class="text-primary"
              >
                <q-tab
                  name="inbox"
                  icon="mail"
                  label="Inbox"
                />
                <q-tab
                  name="appearance"
                  icon="wallpaper"
                  label="Appearance"
                />
                <q-tab
                  name="security"
                  icon="fingerprint"
                  label="Security"
                />
              </q-tabs>
            </template>
            <template v-slot:after>
              <q-tab-panels
                v-model="settingsTab"
                animated
                transition-prev="jump-up"
                transition-next="jump-up"
              >
                <q-tab-panel name="inbox">
                  <div class="row">
                    <div class="col">
                      <div class="row q-pa-md">
                        <q-input
                          outlined
                          v-model="acceptancePrice"
                          label="Inbox Fee *"
                          hint="The minimum fee required for strangers to message you"
                          style="width:100%"
                          type="number"
                          :rules="[ val => val && val.length > 0 || 'Please input an inbox fee']"
                        />
                      </div>
                    </div>
                    <div class="col">
                      <div class="row q-pa-md">
                        <q-select
                          outlined
                          v-model="relayUrl"
                          use-input
                          hide-selected
                          fill-input
                          new-value-mode="add"
                          input-debounce="0"
                          label="Relay URL *"
                          :options="options"
                          @filter="filterRelayFn"
                          style="width:100%"
                        >
                          <template v-slot:no-option>
                            <q-item>
                              <q-item-section class="text-grey">
                                No results
                              </q-item-section>
                            </q-item>
                          </template>
                        </q-select>
                      </div>
                    </div>
                  </div>
                </q-tab-panel>
              </q-tab-panels>
            </template>
          </q-splitter>
        </q-step>

        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn
              v-if="step === 1"
              @click="next()"
              color="primary"
              label="Continue"
            />
            <q-btn
              v-else-if="step === 2"
              @click="next()"
              color="primary"
              :label="seedType==='new'?'New Wallet':'Import Wallet'"
              :disable="!electrumConnected || seed === null"
            />
            <q-btn
              v-else-if="step === 3"
              @click="next()"
              color="primary"
              :disable="!electrumConnected"
              label="Continue"
            />
            <q-btn
              v-else-if="step === 4"
              @click="next()"
              color="primary"
              :disable="!electrumConnected || profile === null"
              label="Continue"
            />
            <q-btn
              v-else
              @click="next()"
              color="primary"
              :disable="!electrumConnected"
              :label="step === 5 ? 'Finish' : 'Continue'"
            />
            <q-btn
              v-if="step > 1"
              flat
              color="primary"
              @click="$refs.stepper.previous()"
              label="Back"
              class="q-ml-sm"
            />
          </q-stepper-navigation>
        </template>
        <template v-slot:message>
          <q-banner
            v-if="step === 1"
            class="bg-primary text-white q-px-lg"
          >
            Welcome to IRCash!
          </q-banner>
          <q-banner
            v-else-if="step === 2"
            class="bg-primary text-white q-px-lg"
          >
            How would you like to add a key to IRCash? </q-banner>
          <q-banner
            v-else-if="step === 3"
            class="bg-primary text-white q-px-lg"
          >
            Deposit Bitcoin Cash to your messaging wallet...
          </q-banner>
          <q-banner
            v-else-if="step === 4"
            class="bg-primary text-white q-px-lg"
          >
            Create your profile...
          </q-banner>
          <q-banner
            v-else
            class="bg-primary text-white q-px-lg"
          >
            Tweak your settings...
          </q-banner>
          <q-banner
            v-if="step === 2"
            class="bg-primary text-white"
            v-show="generatedWarning"
          >
            <span class="text-bold">Warning:</span> Forgetting this seed phrase will result in the bitcoin wallet and any contained money being lost.
            Do not overestimate your ability to remember passphrases especially when you may not use it very often.
            <template v-slot:action>
              <q-btn
                flat
                color="white"
                label="Dismiss"
                @click="generatedWarning = false"
              />
            </template>
          </q-banner>
        </template>
      </q-stepper>
    </div>
  </q-page>
</template>

<script>
import Vue from 'vue'
import VueRouter from 'vue-router'
import { mapActions, mapGetters } from 'vuex'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import KeyserverHandler from '../keyserver/handler'
import pop from '../pop/index'
import RelayClient from '../relay/client'
import relayConstructors from '../relay/constructors'
import IntroductionStep from '../components/setup/IntroductionStep.vue'
import SeedStep from '../components/setup/SeedStep.vue'
import DepositStep from '../components/setup/DepositStep.vue'
import ProfileStep from '../components/setup/ProfileStep.vue'

// eslint-disable-next-line import/no-webpack-loader-syntax
import WalletGenWorker from 'worker-loader!../workers/xpriv_generate.js'

const cashlib = require('bitcore-lib-cash')

Vue.component(VueQrcode.name, VueQrcode)
Vue.use(VueRouter)

const relayUrlOptions = ['34.67.137.105:8080', 'bitcoin.com', 'cashweb.io']

export default {
  components: {
    IntroductionStep,
    SeedStep,
    DepositStep,
    ProfileStep
  },
  data () {
    return {
      step: 1,
      name: '',
      bio: '',
      seed: null,
      seedType: 'new',
      generatedWarning: true,
      xPrivKey: null,
      profile: null,
      acceptancePrice: 500,
      settingsTab: 'inbox',
      relayUrl: '34.67.137.105:8080',
      options: []
    }
  },
  methods: {
    ...mapActions({
      setMyProfile: 'myProfile/setMyProfile',
      setXPrivKey: 'wallet/setXPrivKey',
      initAddresses: 'wallet/initAddresses',
      startListeners: 'wallet/startListeners',
      completeSetup: 'wallet/completeSetup',
      setRelayToken: 'relayClient/setToken',
      setAcceptancePrice: 'myProfile/setAcceptancePrice',
      setRelayClient: 'relayClient/setClient'
    }),
    ...mapGetters({
      getKsHandler: 'keyserverHandler/getHandler',
      getMyAddress: 'wallet/getMyAddress',
      getClient: 'electrumHandler/getClient',
      getAddresses: 'wallet/getAddresses',
      getIdentityPrivKey: 'wallet/getIdentityPrivKey'
    }),
    filterRelayFn (val, update) {
      if (val === '') {
        update(() => {
          this.options = relayUrlOptions
        })
        return
      }

      update(() => {
        const needle = val.toLowerCase()
        this.options = relayUrlOptions.filter(v => v.toLowerCase().indexOf(needle) > -1)
      })
    },
    async next () {
      switch (this.step) {
        case 2:
          this.$q.loading.show({
            delay: 100,
            message: 'Generating wallet...'
          })

          // Setup worker
          let worker = new WalletGenWorker()
          worker.onmessage = async (event) => {
            this.$q.loading.show({
              delay: 100,
              message: 'Gathering balances...'
            })

            let xPrivKeyObj = event.data
            this.xPrivKey = cashlib.HDPrivateKey.fromObject(xPrivKeyObj)
            this.setXPrivKey(this.xPrivKey)
            this.initAddresses()

            this.$q.loading.show({
              delay: 100,
              message: 'Watching wallet...'
            })
            await this.startListeners()

            this.$q.loading.hide()
            this.$refs.stepper.next()
          }

          // Send seed
          worker.postMessage(this.seed)
          break
        case 4:
          await this.setUpProfile()
          this.$refs.stepper.next()

          break
        case 5:
          let client = new RelayClient(this.relayUrl)
          await this.setUpFilter(client)

          let profile = {
            name: this.name,
            bio: this.bio,
            avatar: this.avatarDataURL,
            acceptancePrice: this.acceptancePrice
          }

          this.setRelayClient(client)
          this.setMyProfile(profile)

          this.$q.loading.hide()
          this.completeSetup()
          this.$router.push('/')
          break
        default:
          this.$refs.stepper.next()
      }
    },
    async setUpProfile () {
      // Set profile
      let ksHandler = this.getKsHandler()
      let serverUrl = ksHandler.chooseServer()

      // Request Payment
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      let idAddress = this.getMyAddress()
      let { paymentDetails } = await KeyserverHandler.paymentRequest(serverUrl, idAddress)
      this.$q.loading.show({
        delay: 100,
        message: 'Sending Payment...'
      })

      let { paymentUrl, payment } = await pop.constructPaymentTransaction(paymentDetails)
      let { token } = await pop.sendPayment(paymentUrl, payment)

      this.$q.loading.show({
        delay: 100,
        message: 'Uploading Metadata...'
      })

      // Construct metadata
      let idPrivKey = this.getIdentityPrivKey()
      let metadata = KeyserverHandler.constructProfileMetadata(this.profile, idPrivKey)

      // Put to keyserver
      await KeyserverHandler.putMetadata(idAddress, serverUrl, metadata, token)

      this.$q.loading.hide()
    },
    async setUpFilter (client) {
      // Set filter
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      let idAddress = this.getMyAddress()
      let filterPaymentRequest = await client.filterPaymentRequest(idAddress.toLegacyAddress())

      // Send payment
      this.$q.loading.show({
        delay: 100,
        message: 'Sending Payment...'
      })

      // Get token from relay server
      let { paymentUrl, payment } = await pop.constructPaymentTransaction(filterPaymentRequest.paymentDetails)
      let { token } = await pop.sendPayment(paymentUrl, payment)
      this.setRelayToken(token)

      // Create filter application
      let idPrivKey = this.getIdentityPrivKey()
      let filterApplication = relayConstructors.constructPriceFilterApplication(true, this.acceptancePrice, this.acceptancePrice, idPrivKey)

      this.$q.loading.show({
        delay: 100,
        message: 'Opening Inbox...'
      })

      // Apply remotely
      await client.applyFilter(idAddress.toLegacyAddress(), filterApplication, token)

      // Apply locally
      this.setAcceptancePrice(this.acceptancePrice)
    }
  },
  computed: {
    ...mapGetters({ electrumConnected: 'electrumHandler/connected' })
  }
}
</script>
