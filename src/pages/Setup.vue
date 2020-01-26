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
          <deposit-step />
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
          <settings-step v-on:settings="settings = $event" />
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
              :disable="!electrumConnected || settings === null"
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
import KeyserverHandler from '../keyserver/handler'
import pop from '../pop/index'
import RelayClient from '../relay/client'
import relayConstructors from '../relay/constructors'
import IntroductionStep from '../components/setup/IntroductionStep.vue'
import SeedStep from '../components/setup/SeedStep.vue'
import DepositStep from '../components/setup/DepositStep.vue'
import ProfileStep from '../components/setup/ProfileStep.vue'
import SettingsStep from '../components/setup/SettingsStep.vue'
import { defaultAcceptancePrice, defaultRelayUrl } from '../utils/constants'

// eslint-disable-next-line import/no-webpack-loader-syntax
import WalletGenWorker from 'worker-loader!../workers/xpriv_generate.js'

const cashlib = require('bitcore-lib-cash')

Vue.use(VueRouter)

export default {
  components: {
    IntroductionStep,
    SeedStep,
    DepositStep,
    ProfileStep,
    SettingsStep
  },
  data () {
    return {
      step: 1,
      name: '',
      bio: '',
      seedType: 'new',
      seed: null,
      generatedWarning: true,
      xPrivKey: null,
      profile: null,
      settings: {
        acceptancePrice: defaultAcceptancePrice,
        relayUrl: defaultRelayUrl
      }
    }
  },
  methods: {
    ...mapActions({
      setMyProfile: 'myProfile/setMyProfile',
      setXPrivKey: 'wallet/setXPrivKey',
      initAddresses: 'wallet/initAddresses',
      startListeners: 'wallet/startListeners',
      completeSetup: 'wallet/completeSetup',
      updateUTXOs: 'wallet/updateUTXOs',
      setRelayToken: 'relayClient/setToken',
      setAcceptancePrice: 'myProfile/setAcceptancePrice',
      setRelayClient: 'relayClient/setClient'
    }),
    ...mapGetters({
      getKsHandler: 'keyserverHandler/getHandler',
      getMyAddress: 'wallet/getMyAddress',
      getClient: 'electrumHandler/getClient',
      getAllAddresses: 'wallet/getAllAddresses',
      getIdentityPrivKey: 'wallet/getIdentityPrivKey'
    }),
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
            this.updateUTXOs()

            this.$q.loading.show({
              delay: 100,
              message: 'Watching wallet...'
            })
            let addresses = Object.keys(this.getAllAddresses())
            await this.startListeners(addresses)

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
          let client = new RelayClient(this.settings.relayUrl)
          await this.setUpFilter(client)

          let profile = this.profile
          profile.acceptancePrice = this.settings.acceptancePrice

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
      this.setAcceptancePrice(this.settings.acceptancePrice)
    }
  },
  computed: {
    ...mapGetters({ electrumConnected: 'electrumHandler/connected' })
  }
}
</script>
