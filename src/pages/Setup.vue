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
          v-if="!isBasic"
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
          v-if="!isBasic"
          :name="6"
          title="Settings"
          icon="build"
        >
          <settings-step v-model="settings" />
        </q-step>
        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn
              @click="next()"
              color="primary"
              :label="forwardLabel()"
              :disable="forwardDisabled()"
            />
            <q-btn
              v-if="step > 1"
              flat
              color="primary"
              @click="previous()"
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
import { errorNotify } from '../utils/notifications'

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
  props: {
    isBasic: Boolean
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
    nextIntroduction () {
      this.$refs.stepper.next()
    },
    nextWallet () {
      // Reset wallet
      // TODO: This should not be done "behind the back" of the wallet object
      // (e.g. we should not be fiddling with the store directly here)
      this.resetWallet()

      this.$q.loading.show({
        delay: 100,
        message: 'Generating wallet...'
      })

      // Setup worker
      const worker = new WalletGenWorker()
      worker.onmessage = async (event) => {
        this.$q.loading.show({
          delay: 100,
          message: 'Gathering balances...'
        })

        // Prepare wallet
        const xPrivKeyObj = event.data
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
          errorNotify(err)
          return
        }

        // Check for existing metadata
        this.$q.loading.show({
          delay: 100,
          message: 'Searching for existing keyserver metadata...'
        })

        const ksHandler = new KeyserverHandler()
        const idAddress = this.$wallet.myAddress

        // Try find relay URL on keyserver
        try {
          const foundRelayUrl = await ksHandler.getRelayUrl(idAddress)
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
            const keyserverErr = new Error('Unable to contact keyserver')
            errorNotify(keyserverErr)
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
    async nextDeposit () {
      if (this.isBasic) {
        try {
          await this.setUpKeyserver()
        } catch (err) {
          console.error(err)
          this.$q.loading.hide()
          return
        }

        this.$q.loading.hide()
        this.$refs.stepper.goTo(5)
      } else {
        this.$refs.stepper.next()
      }
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
      const ksHandler = new KeyserverHandler()
      const serverUrl = ksHandler.chooseServer()

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: 'Searching for existing relay data...'
      })

      // Get profile from relay server
      // We do this first to prevent uploading broken URL to keyserver
      const idAddress = this.$wallet.myAddress
      const { client: relayClient } = getRelayClient({ relayUrl: this.relayUrl, store: this.$store, electrumClient: this.$electrumClient, wallet: this.$wallet })

      try {
        this.relayData = await relayClient.getRelayData(idAddress)
      } catch (err) {
        this.relayData = defaultRelayData
        if (!err.response) {
          // Relay URL malformed
          errorNotify(new Error('Network Error: Relay server connection died. '))
          throw err
        }
      }

      // Request Payment
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      try {
        const { paymentDetails } = await KeyserverHandler.paymentRequest(serverUrl, idAddress)

        this.$q.loading.show({
          delay: 100,
          message: 'Sending Payment...'
        })

        // Construct payment
        const { paymentUrl, payment } = pop.constructPaymentTransaction(this.$wallet, paymentDetails)
        const { token } = await pop.sendPayment(paymentUrl, payment)

        // Construct metadata
        const idPrivKey = this.$wallet.identityPrivKey
        const metadata = KeyserverHandler.constructRelayUrlMetadata(this.relayUrl, idPrivKey)

        this.$q.loading.show({
          delay: 100,
          message: 'Uploading Metadata...'
        })

        await KeyserverHandler.putMetadata(idAddress, serverUrl, metadata, token)
      } catch (err) {
        errorNotify(err)
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
      if (this.isBasic) {
        this.nextSettings()
      } else {
        this.$refs.stepper.next()
      }
    },
    async setupRelay () {
      const { client: relayClient } = getRelayClient({ relayUrl: this.relayUrl, store: this.$store, electrumClient: this.$electrumClient, wallet: this.$wallet })

      // Set filter
      this.$q.loading.show({
        delay: 100,
        message: 'Requesting Payment...'
      })

      const idAddress = this.$wallet.myAddress
      try {
        const relayPaymentRequest = await relayClient.profilePaymentRequest(idAddress.toLegacyAddress())
        // Send payment
        this.$q.loading.show({
          delay: 100,
          message: 'Sending Payment...'
        })

        // Get token from relay server
        const { paymentUrl, payment } = pop.constructPaymentTransaction(this.$wallet, relayPaymentRequest.paymentDetails)
        const { token } = await relayClient.sendPayment(paymentUrl, payment)
        relayClient.setToken(token)
        this.setRelayToken(token)
        this.$relayClient.setToken(token)
      } catch (err) {
        errorNotify(new Error('Network error: Relay disconnnected unexpectedly.'))
        throw err
      }

      // Create metadata
      const idPrivKey = this.$wallet.identityPrivKey

      const acceptancePrice = this.relayData.inbox.acceptancePrice
      const priceFilter = constructPriceFilter(true, acceptancePrice, acceptancePrice, idPrivKey)
      const metadata = constructProfileMetadata(this.relayData.profile, priceFilter, idPrivKey)

      this.$q.loading.show({
        delay: 100,
        message: 'Opening Inbox...'
      })

      // Apply remotely
      try {
        await relayClient.putProfile(idAddress.toLegacyAddress(), metadata)
      } catch (err) {
        // TODO: move specialization down to errorNotify
        if (err.response.status === 413) {
          errorNotify('Profile image is too large, select a smaller image.')
          throw err
        }
        errorNotify(new Error('Network error: Relay disconnnected unexpectedly.'))
        throw err
      }

      // Apply locally
      this.setRelayData(this.relayData)
      this.setSeedPhrase(this.seed)
    },
    setupSettings () {
      this.darkMode(this.settings.appearance.darkMode)
      this.$q.dark.set(this.settings.appearance.darkMode)
      this.updateInterval(this.settings.networking.updateInterval * 1_000)
    },
    nextSettings () {
      this.setupSettings()
      this.$router.push('/')
    },
    next () {
      switch (this.step) {
        case 1:
          this.nextIntroduction()
          break
        case 2:
          this.nextWallet()
          break
        case 3:
          this.nextDeposit()
          break
        case 4:
          this.nextKeyserver()
          break
        case 5:
          this.nextRelay()
          break
        case 6:
          this.nextSettings()
      }
    },
    forwardLabel () {
      switch (this.step) {
        case 1:
          return 'Continue'
        case 2:
          return (this.seedData.type === 'new') ? 'New Wallet' : 'Import Wallet'
        case 3:
          return 'Continue'
        case 4:
          return 'Continue'
        case 5:
          return this.isBasic ? 'Finish' : 'Continue'
        case 6:
          return 'Finish'
      }
    },
    forwardDisabled () {
      // Cannot progress while electrum is disconnected
      if (!this.electrumConnected) {
        return true
      }

      switch (this.step) {
        case 2:
          return !this.isWalletValid
        case 5:
          return !this.isRelayValid
        case 6:
          return (this.settings === null)
      }
      return false
    },
    previous () {
      switch (this.step) {
        case 4:
          if (this.isBasic) {
            this.$refs.stepper.goTo(2)
            return
          }
      }
      this.$refs.stepper.previous()
    }
  },
  watch: {
    isBasic (newValue) {
      if (newValue && this.step === 4) {
        this.step = 3
      } else if (newValue && this.step === 6) {
        this.step = 5
      }
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
  created () {
    // Reset all messaging
    this.resetChats()
  }
}
</script>
