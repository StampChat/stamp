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
          :done="step > 3"
        >
          <deposit-step />
        </q-step>

        <q-step
          :name="4"
          title="Choose a relay server"
          icon="email"
          :done="step > 4"
        >
          <choose-relay-step v-model="relayUrl" />
        </q-step>
        <q-step
          :name="5"
          title="Setup Profile"
          icon="person"
          :done="step > 5"
        >
          <profile-step v-model="relayData" />
        </q-step>
        <q-step
          :name="6"
          title="Settings"
          icon="build"
        >
          <settings-step v-model="settings" />
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
              :disable="!electrumConnected || !isWalletValid"
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
              :disable="!electrumConnected || !isRelayValid"
              label="Continue"
            />
            <q-btn
              v-else
              @click="nextSettings()"
              color="primary"
              :disable="!electrumConnected || settings === null"
              label='Finish'
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
      </q-stepper>
    </div>
  </q-page>
</template>

<script>
import Vue from 'vue'
import VueRouter from 'vue-router'
import { mapActions, mapGetters, mapMutations } from 'vuex'
import KeyserverHandler from '../keyserver/handler'
import pop from '../pop/index'
import { getRelayClient } from '../utils/relay-client-factory'
import { constructProfileMetadata, constructPriceFilter } from '../relay/constructors'
import IntroductionStep from '../components/setup/IntroductionStep.vue'
import SeedStep from '../components/setup/SeedStep.vue'
import DepositStep from '../components/setup/DepositStep.vue'
import ChooseRelayStep from '../components/setup/ChooseRelayStep.vue'
import ProfileStep from '../components/setup/ProfileStep'
import SettingsStep from '../components/setup/SettingsStep.vue'
import { defaultRelayData, defaultRelayUrl } from '../utils/constants'
import {
  keyserverDisconnectedNotify,
  insuffientFundsNotify,
  paymentFailureNotify,
  relayDisconnectedNotify,
  walletDisconnectedNotify,
  profileTooLargeNotify
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
      seed: null,
      generatedWarning: true,
      xPrivKey: null,
      relayData: defaultRelayData,
      relayUrl: defaultRelayUrl,
      settings: {
        networking: {
          updateInterval: this.getUpdateInterval() / 1_000
        },
        appearance: {
          darkMode: this.getDarkMode()
        }
        // TODO
        // appearance: null,
        // security: null
      }
    }
  },
  methods: {
    ...mapActions({
      setRelayToken: 'relayClient/setToken',
      resetChats: 'chats/reset',
      darkMode: 'appearance/setDarkMode'
    }),
    ...mapGetters({
      getUpdateInterval: 'contacts/getUpdateInterval',
      getDarkMode: 'appearance/getDarkMode'
    }),
    ...mapMutations({
      setRelayData: 'myProfile/setRelayData',
      resetWallet: 'wallet/reset',
      setXPrivKey: 'wallet/setXPrivKey',
      setSeedPhrase: 'wallet/setSeedPhrase',
      updateInterval: 'contacts/setUpdateInterval'
    }),
    next () {
      this.$refs.stepper.next()
    },
    async nextWallet () {
      // Reset wallet
      // TODO: This should not be done "behind the back" of the wallet object
      // (e.g. we should not be fiddling with the store directly here)
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
        // TODO: We should not have to update two places.
        this.setXPrivKey(this.xPrivKey)
        this.$wallet.setXPrivKey(this.xPrivKey)

        this.$q.loading.show({
          delay: 100,
          message: 'Watching wallet...'
        })

        // Listen to addresses
        try {
          await this.$wallet.init()
        } catch (err) {
          console.error(err)
          walletDisconnectedNotify()
          return
        }

        // Check for existing metadata
        this.$q.loading.show({
          delay: 100,
          message: 'Searching for existing keyserver metadata...'
        })

        let ksHandler = new KeyserverHandler()
        let idAddress = this.$wallet.myAddress

        // Try find relay URL on keyserver
        try {
          var foundRelayUrl = await ksHandler.getRelayUrl(idAddress)
          this.relayUrl = foundRelayUrl

          // No URL entry
          if (!foundRelayUrl) {
            this.relayUrl = defaultRelayUrl
          }
          this.$refs.stepper.next()
          this.$q.loading.hide()
        } catch (err) {
          // No URL found
          if (err.response.status === 404) {
            this.relayUrl = defaultRelayUrl

            this.$refs.stepper.next()
            this.$q.loading.hide()
          } else {
            this.$q.loading.hide()
            keyserverDisconnectedNotify()
          }
        }
      }

      // Send seed
      if (this.seedData.type === 'new') {
        this.seed = this.seedData.generatedSeed
      } else {
        this.seed = this.seedData.importedSeed
      }
      worker.postMessage(this.seed)
    },
    async nextKeyserver () {
      try {
        await this.setUpKeyserver()
      } catch (err) {
        console.error(err)
        if (err.response) {
          console.error(err.response)
        }
        this.$q.loading.hide()
        return
      }

      this.$q.loading.hide()
      this.$refs.stepper.next()
    },
    async setUpKeyserver () {
      // Set profile
      let ksHandler = new KeyserverHandler()
      let serverUrl = ksHandler.chooseServer()

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: 'Searching for existing relay data...'
      })

      // Get profile from relay server
      // We do this first to prevent uploading broken URL to keyserver
      let idAddress = this.$wallet.myAddress
      let { client: relayClient } = getRelayClient({ relayUrl: this.relayUrl, store: this.$store, electrumClient: this.$electrumClient, wallet: this.$wallet })

      try {
        this.relayData = await relayClient.getRelayData(idAddress)
      } catch (err) {
        this.relayData = defaultRelayData
        if (!err.response) {
          // Relay URL malformed
          relayDisconnectedNotify()
          throw err
        }
      }

      // Request Payment
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      try {
        var { paymentDetails } = await KeyserverHandler.paymentRequest(serverUrl, idAddress)
      } catch (err) {
        keyserverDisconnectedNotify()
        throw err
      }
      this.$q.loading.show({
        delay: 100,
        message: 'Sending Payment...'
      })

      // Construct payment
      try {
        var { paymentUrl, payment } = await pop.constructPaymentTransaction(this.$wallet, paymentDetails)
      } catch (err) {
        insuffientFundsNotify()
        throw err
      }

      // Send payment
      try {
        var { token } = await pop.sendPayment(paymentUrl, payment)
      } catch (err) {
        paymentFailureNotify()
        throw err
      }

      this.$q.loading.show({
        delay: 100,
        message: 'Uploading Metadata...'
      })

      // Construct metadata
      let idPrivKey = this.$wallet.identityPrivKey
      let metadata = KeyserverHandler.constructRelayUrlMetadata(this.relayUrl, idPrivKey)

      // Put to keyserver
      try {
        await KeyserverHandler.putMetadata(idAddress, serverUrl, metadata, token)
      } catch (err) {
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
      let { client: relayClient } = getRelayClient({ relayUrl: this.relayUrl, store: this.$store, electrumClient: this.$electrumClient, wallet: this.$wallet })

      // Set filter
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      let idAddress = this.$wallet.myAddress
      try {
        var relayPaymentRequest = await relayClient.profilePaymentRequest(idAddress.toLegacyAddress())
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
        var { paymentUrl, payment } = await pop.constructPaymentTransaction(this.$wallet, relayPaymentRequest.paymentDetails)
      } catch (err) {
        console.error(err)
        if (err.response) {
          console.error(err.response)
        }
        insuffientFundsNotify()
        throw err
      }
      try {
        const { token } = await relayClient.sendPayment(paymentUrl, payment)
        relayClient.setToken(token)
        this.setRelayToken(token)
        this.$relayClient.setToken(token)
      } catch (err) {
        console.error(err)
        if (err.response) {
          console.error(err.response)
        }
        paymentFailureNotify()
        throw err
      }

      // Create metadata
      let idPrivKey = this.$wallet.identityPrivKey

      let acceptancePrice = this.relayData.inbox.acceptancePrice
      let priceFilter = constructPriceFilter(true, acceptancePrice, acceptancePrice, idPrivKey)
      let metadata = constructProfileMetadata(this.relayData.profile, priceFilter, idPrivKey)

      this.$q.loading.show({
        delay: 100,
        message: 'Opening Inbox...'
      })

      // Apply remotely
      try {
        await relayClient.putProfile(idAddress.toLegacyAddress(), metadata)
      } catch (err) {
        console.error(err)
        if (err.response.status === 413) {
          profileTooLargeNotify()
          throw err
        }
        relayDisconnectedNotify()
        throw err
      }

      // Apply locally
      this.setRelayData(this.relayData)
      this.setSeedPhrase(this.seed)
    },
    nextSettings () {
      this.darkMode(this.settings.appearance.darkMode)
      this.$q.dark.set(this.settings.appearance.darkMode)
      this.updateInterval(this.settings.networking.updateInterval * 1_000)
      this.$router.push('/')
    }
  },
  computed: {
    electrumConnected () {
      return this.$electrum.connected
    },
    isWalletValid () {
      return ((this.seedData.type === 'new') || (this.seedData.type === 'import' && this.seedData.valid))
    },
    isRelayValid () {
      return !!(this.relayData.profile.name && this.relayData.profile.avatar && this.relayData.inbox.acceptancePrice)
    }
  },
  async created () {
    // Reset all messaging
    this.resetChats()
  }
}
</script>
