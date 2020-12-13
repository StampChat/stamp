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
          :title="$t('setup.welcome')"
          icon="settings"
          :done="step > 1"
        >
          <introduction-step />
        </q-step>

        <q-step
          :name="2"
          :title="$t('setup.setupWallet')"
          icon="vpn_key"
          :done="step > 2"
        >
          <seed-step v-model="seedData" />
        </q-step>

        <q-step
          :name="3"
          :title="$t('setup.deposit')"
          icon="attach_money"
          :done="step > 3"
        >
          <deposit-step />
        </q-step>

        <q-step
          v-if="!isBasic"
          :name="4"
          :title="$t('setup.chooseRelay')"
          icon="email"
          :done="step > 4"
        >
          <choose-relay-step v-model="relayUrl" />
        </q-step>
        <q-step
          :name="5"
          :title="$t('setup.setupProfile')"
          icon="person"
          :done="step > 5"
        >
          <profile-step v-model="relayData" />
        </q-step>
        <q-step
          v-if="!isBasic"
          :name="6"
          :title="$t('setup.settings')"
          icon="build"
        >
          <settings-step v-model="settings" />
        </q-step>
        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn
              @click="next()"
              color="primary"
              :label="forwardLabel"
              :disable="!forwardEnabled"
            />
            <q-btn
              v-if="step > 1"
              flat
              color="primary"
              @click="previous()"
              :label="$t('setup.back')"
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
import pop from '../pop'
import { getRelayClient } from '../adapters/vuex-relay-adapter'
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

import { HDPrivateKey } from 'bitcore-lib-cash'
import { generateMnemonic } from 'bip39'

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
        generatedSeed: this.getSeedPhrase() || generateMnemonic(),
        importedSeed: this.getSeedPhrase() || '',
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
      getDarkMode: 'appearance/getDarkMode',
      getSeedPhrase: 'wallet/getSeedPhrase'
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
      this.$wallet.clearUtxos()

      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.generatingWallet')
      })

      // Setup worker
      const worker = new WalletGenWorker()
      worker.onmessage = async (event) => {
        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.gatheringBalances')
        })

        // Prepare wallet
        const xPrivKeyObj = event.data
        this.xPrivKey = HDPrivateKey.fromObject(xPrivKeyObj)
        // TODO: We should not have to update two places.
        this.setXPrivKey(this.xPrivKey)
        this.$wallet.setXPrivKey(this.xPrivKey)

        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.watchingWallet')
        })

        // Check for existing metadata
        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.searchingExistingMetaData')
        })

        const ksHandler = new KeyserverHandler({ wallet: this.$wallet })
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
            const keyserverErr = new Error(this.$t('setup.errorContactKeyServer'))
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
      this.setSeedPhrase(this.seed)
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
      const ksHandler = new KeyserverHandler({ wallet: this.$wallet })

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.searchingRelay')
      })

      // Get profile from relay server
      // We do this first to prevent uploading broken URL to keyserver
      const idAddress = this.$wallet.myAddress
      const { client: relayClient } = await getRelayClient({ relayUrl: this.relayUrl, store: this.$store, wallet: this.$wallet })

      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.sendingPayment')
      })

      try {
        this.relayData = await relayClient.getRelayData(idAddress)
      } catch (err) {
        this.relayData = defaultRelayData
        if (!err.response) {
          // Relay URL malformed
          errorNotify(new Error(this.$t('setup.networkErrorRelayDied')))
          throw err
        }
      }
      try {
        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.uploadingMetaData')
        })
        const idPrivKey = this.$wallet.identityPrivKey
        await ksHandler.updateKeyMetadata(this.relayUrl, idPrivKey)
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
      const { client: relayClient } = await getRelayClient({ relayUrl: this.relayUrl, store: this.$store, electrumClientPromise: this.$electrumClientPromise, wallet: this.$wallet })

      // Set filter
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.requestingPayment')
      })

      const idAddress = this.$wallet.myAddress
      try {
        const relayPaymentRequest = await relayClient.profilePaymentRequest(idAddress.toLegacyAddress().toString())
        // Send payment
        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.sendingPayment')
        })

        // Get token from relay server
        const { paymentUrl, payment } = await pop.constructPaymentTransaction(this.$wallet, relayPaymentRequest.paymentDetails)
        const paymentUrlFull = new URL(paymentUrl, this.relayUrl)
        console.log('Sending payment to', paymentUrlFull.href)
        const { token } = await pop.sendPayment(paymentUrlFull.href, payment)
        relayClient.setToken(token)
        this.setRelayToken(token)
        this.$relayClient.setToken(token)
      } catch (err) {
        errorNotify(new Error(this.$t('setup.networkErrorRelayUnexpected')))
        throw err
      }

      // Create metadata
      const idPrivKey = this.$wallet.identityPrivKey

      const acceptancePrice = this.relayData.inbox.acceptancePrice

      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.openingInbox')
      })

      try {
        await this.$relayClient.updateProfile(idPrivKey, this.relayData.profile, acceptancePrice)
      } catch (err) {
        console.error(err)
        // TODO: ProfileDialog uses different localization for no particular reason.
        // TODO: move specialization down to errorNotify
        if (err.response.status === 413) {
          errorNotify(new Error(this.$t('setup.profileImageLargeError')))
          throw err
        }
        errorNotify(new Error(this.$t('setup.networkErrorRelayUnexpected')))
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
    ...mapGetters({ balance: 'wallet/balance' }),
    forwardEnabled () {
      if (!this.$electrum.connected) {
        return false
      }

      switch (this.step) {
        case 2:
          return this.isWalletValid
        case 3:
          return this.isWalletNonEmpty
        case 5:
          return this.isRelayValid && this.isWalletNonEmpty
        case 6:
          return this.settings !== null
        default:
          return true
      }
    },
    isWalletValid () {
      return ((this.seedData.type === 'new') || (this.seedData.type === 'import' && this.seedData.valid))
    },
    isRelayValid () {
      return !!(this.relayData.profile.name && this.relayData.profile.avatar && this.relayData.inbox.acceptancePrice)
    },
    isWalletNonEmpty () {
      return !!this.balance
    },
    forwardLabel () {
      switch (this.step) {
        case 1:
          return this.$t('setup.continue')
        case 2:
          return (this.seedData.type === 'new') ? this.$t('setup.newWallet') : this.$t('setup.importWallet')
        case 3:
          return this.$t('setup.continue')
        case 4:
          return this.$t('setup.continue')
        case 5:
          return this.isBasic ? this.$t('setup.finish') : this.$t('setup.continue')
        case 6:
          return this.$t('setup.finish')
      }
      return this.$t('setup.unkown')
    }
  },
  created () {
    // Reset all messaging
    this.resetChats()
  }
}
</script>
