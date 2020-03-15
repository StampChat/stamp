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
          <seed-step v-model='seedData' />
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
          title="Choose a relay server"
          icon="email"
          style="min-height: 300px;"
          :done="step > 4"
        >
          <choose-relay-step v-model="relayUrl" />
        </q-step>
        <q-step
          :name="5"
          title="Setup Profile"
          icon="person"
          style="min-height: 300px;"
        >
          <profile-step v-model="relayData" />
        </q-step>
        <q-step
          :name="6"
          title="Settings"
          icon="build"
          style="min-height: 300px;"
        >
          <settings-step />
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
              @click="nextWallet()"
              color="primary"
              :label="seedData.type==='new'?'New Wallet':'Import Wallet'"
              :disable="!(electrumConnected && ((seedData.type === 'new') || (seedData.type === 'import' && seedData.valid)))"
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
              @click="nextKeyserver()"
              color="primary"
              :disable="!electrumConnected"
              label="Continue"
            />
            <q-btn
              v-else-if="step === 5"
              @click="nextRelay()"
              color="primary"
              :disable="!electrumConnected"
              label="Continue"
            />
            <q-btn
              v-else
              @click="nextSettings()"
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
            Welcome to Stamp!
          </q-banner>
          <q-banner
            v-else-if="step === 2"
            class="bg-primary text-white q-px-lg"
          >
            How would you like to generate a wallet? </q-banner>
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
            Choose a relay server...
          </q-banner>
          <q-banner
            v-else
            class="bg-primary text-white q-px-lg"
          >
            Create your profile...
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
import { constructProfileMetadata, constructPriceFilter } from '../relay/constructors'
import IntroductionStep from '../components/setup/IntroductionStep.vue'
import SeedStep from '../components/setup/SeedStep.vue'
import DepositStep from '../components/setup/DepositStep.vue'
import ChooseRelayStep from '../components/setup/ChooseRelayStep.vue'
import ProfileStep from '../components/setup/ProfileStep.vue'
import SettingsStep from '../components/setup/SettingsStep.vue'
import { defaultRelayData, defaultRelayUrl, electrumURL } from '../utils/constants'
import {
  keyserverDisconnectedNotify,
  insuffientFundsNotify,
  paymentFailureNotify,
  relayDisconnectedNotify,
  walletDisconnectedNotify
} from '../utils/notifications'

// eslint-disable-next-line import/no-webpack-loader-syntax
import WalletGenWorker from 'worker-loader!../workers/xpriv_generate.js'

const cashlib = require('bitcore-lib-cash')

Vue.use(VueRouter)

export default {
  components: {
    IntroductionStep,
    SeedStep,
    DepositStep,
    ChooseRelayStep,
    ProfileStep,
    SettingsStep
  },
  data () {
    return {
      step: 1,
      name: '',
      bio: '',
      seedData: {
        type: 'new',
        generatedSeed: '',
        importedSeed: '',
        valid: false
      },
      generatedWarning: true,
      xPrivKey: null,
      relayData: defaultRelayData,
      relayUrl: defaultRelayUrl,
      settings: {
        // TODO
        // appearance: null,
        // security: null
      }
    }
  },
  methods: {
    ...mapActions({
      setMyProfile: 'myProfile/setMyProfile',
      setXPrivKey: 'wallet/setXPrivKey',
      initAddresses: 'wallet/initAddresses',
      startListeners: 'wallet/startListeners',
      updateHDUTXOs: 'wallet/updateHDUTXOs',
      setRelayToken: 'relayClient/setToken',
      setAcceptancePrice: 'myProfile/setAcceptancePrice',
      newElectrumClient: 'electrumHandler/new',
      electrumConnect: 'electrumHandler/connect',
      electrumKeepAlive: 'electrumHandler/keepAlive',
      setRelayClient: 'relayClient/setClient',
      resetWallet: 'wallet/reset',
      setSeedPhrase: 'wallet/setSeedPhrase',
      resetChats: 'chats/reset'
    }),
    ...mapGetters({
      getKsHandler: 'keyserverHandler/getHandler',
      getMyAddress: 'wallet/getMyAddress',
      getClient: 'electrumHandler/getClient',
      getAllAddresses: 'wallet/getAllAddresses',
      getIdentityPrivKey: 'wallet/getIdentityPrivKey'
    }),
    next () {
      this.$refs.stepper.next()
    },
    async nextWallet () {
      // Reset wallet
      this.resetWallet()

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

        // Prepare wallet
        let xPrivKeyObj = event.data
        this.xPrivKey = cashlib.HDPrivateKey.fromObject(xPrivKeyObj)
        this.setXPrivKey(this.xPrivKey)
        this.initAddresses()
        try {
          this.updateHDUTXOs()
        } catch (err) {
          console.error(err)
          walletDisconnectedNotify()
        }

        this.$q.loading.show({
          delay: 100,
          message: 'Watching wallet...'
        })

        // Listen to addresses
        try {
          let addresses = Object.keys(this.getAllAddresses())
          await this.startListeners(addresses) // TODO: Better handling here
        } catch (err) {
          console.error(err)
          walletDisconnectedNotify()
          return
        }

        // Check for existing profile
        this.$q.loading.show({
          delay: 100,
          message: 'Searching for existing profile...'
        })
        let ksHandler = this.getKsHandler()
        let idAddress = this.getMyAddress()

        // Try find relay URL on keyserver
        try {
          var foundRelayUrl = await ksHandler.getRelayUrl(idAddress)

          // No URL entry
          if (!foundRelayUrl) {
            this.relayData = defaultRelayData

            this.$refs.stepper.next()
            this.$q.loading.hide()
            return
          }
        } catch (err) {
          // No URL found
          if (err.response.status === 404) {
            this.relayData = defaultRelayData

            this.$refs.stepper.next()
            this.$q.loading.hide()
          } else {
            this.$q.loading.hide()
            keyserverDisconnectedNotify()
          }
          return
        }

        // Get profile from relay server
        let relayClient = new RelayClient(foundRelayUrl)
        try {
          let relayData = await relayClient.getRelayData(idAddress)
          this.relayData = relayData
        } catch (err) {
          if (!err.response) {
            // Relay URL malformed
            this.$refs.stepper.next()
            this.$q.loading.hide()
            relayDisconnectedNotify()
          } else if (err.response.status === 404) {
            // Relay URL points to missing profile
            this.relayData = defaultRelayData

            this.$refs.stepper.next()
            this.$q.loading.hide()
          }
        }
      }

      // Send seed
      let seed
      if (this.seedData.type === 'new') {
        seed = this.seedData.generatedSeed
      } else {
        seed = this.seedData.importedSeed
      }
      worker.postMessage(seed)
    },
    async nextKeyserver () {
      try {
        await this.setUpKeyserver()
      } catch (err) {
        console.error(err)
        this.$q.loading.hide()
        return
      }

      this.$q.loading.hide()
      this.$refs.stepper.next()
    },
    async setUpKeyserver () {
      // Set profile
      let ksHandler = this.getKsHandler()
      let serverUrl = ksHandler.chooseServer()

      // Request Payment
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      let idAddress = this.getMyAddress()
      try {
        var { paymentDetails } = await KeyserverHandler.paymentRequest(serverUrl, idAddress)
      } catch (err) {
        console.error(err)
        keyserverDisconnectedNotify()
        throw err
      }
      this.$q.loading.show({
        delay: 100,
        message: 'Sending Payment...'
      })

      // Construct payment
      try {
        var { paymentUrl, payment } = await pop.constructPaymentTransaction(paymentDetails)
      } catch (err) {
        console.error(err)
        insuffientFundsNotify()
        throw err
      }

      // Send payment
      try {
        var { token } = await pop.sendPayment(paymentUrl, payment)
      } catch (err) {
        console.error(err)
        paymentFailureNotify()
        throw err
      }

      this.$q.loading.show({
        delay: 100,
        message: 'Uploading Metadata...'
      })

      // Construct metadata
      let idPrivKey = this.getIdentityPrivKey()
      let metadata = KeyserverHandler.constructRelayUrlMetadata(this.relayUrl, idPrivKey)

      // Put to keyserver
      try {
        await KeyserverHandler.putMetadata(idAddress, serverUrl, metadata, token)
      } catch (err) {
        console.error(err)
        keyserverDisconnectedNotify()
        throw err
      }
    },
    async nextRelay () {
      try {
        await this.setupRelay()
      } catch (err) {
        console.error(err)
        this.$q.loading.hide()
        return
      }

      this.$q.loading.hide()
      this.$refs.stepper.next()
    },
    async setupRelay () {
      let client = new RelayClient(this.relayUrl)

      // Set filter
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      let idAddress = this.getMyAddress()
      try {
        var profilePaymentRequest = await client.profilePaymentRequest(idAddress.toLegacyAddress())
      } catch (err) {
        console.error(err)
        relayDisconnectedNotify()
        throw err
      }

      // Send payment
      this.$q.loading.show({
        delay: 100,
        message: 'Sending Payment...'
      })

      // Get token from relay server
      try {
        var { paymentUrl, payment } = await pop.constructPaymentTransaction(profilePaymentRequest.paymentDetails)
      } catch (err) {
        console.error(err)
        console.error(err.response)
        insuffientFundsNotify()
        throw err
      }
      try {
        var { token } = await client.sendPayment(paymentUrl, payment)
      } catch (err) {
        console.error(err)
        paymentFailureNotify()
        throw err
      }
      this.setRelayToken(token)

      // Create metadata
      let idPrivKey = this.getIdentityPrivKey()

      let acceptancePrice = this.relayData.inbox.acceptancePrice
      let priceFilter = constructPriceFilter(true, acceptancePrice, acceptancePrice, idPrivKey)
      let metadata = constructProfileMetadata(this.relayData.profile, priceFilter, idPrivKey)

      this.$q.loading.show({
        delay: 100,
        message: 'Opening Inbox...'
      })

      // Apply remotely
      try {
        await client.putProfile(idAddress.toLegacyAddress(), metadata, token)
      } catch (err) {
        console.error(err)
        relayDisconnectedNotify()
        throw err
      }

      // Apply locally
      this.setAcceptancePrice(acceptancePrice)
      let profile = this.relayData.profile
      profile.acceptancePrice = acceptancePrice

      this.setRelayClient(client)
      this.setMyProfile(profile)
      this.setSeedPhrase(this.seed)

      this.$q.loading.hide()
      this.$router.push('/')
    }
  },
  computed: {
    ...mapGetters({ electrumConnected: 'electrumHandler/connected' })
  },
  async created () {
    // Reset all messaging
    this.resetChats()

    // Set electrum client
    this.newElectrumClient({ host: electrumURL, port: 50001, protocol: 'tcp' })
    await this.electrumConnect()
    this.electrumKeepAlive()
  }
}
</script>
