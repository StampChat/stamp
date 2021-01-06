<template>
  <q-page>
    <div class="q-pa-md">
      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        alternative-labels
      >
        <q-step
          :name="1"
          :title="$t('setup.setupWallet')"
          icon="vpn_key"
          :done="step > 1"
        >
          <account-step v-model="accountData" />
        </q-step>
        <q-step
          :name="2"
          :title="$t('setup.deposit')"
          icon="attach_money"
          :done="step > 2"
        >
          <deposit-step />
        </q-step>
        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn
              @click="next()"
              color="primary"
              :label="nextButtonLabel"
              :disable="!forwardEnabled"
            />
            <q-btn
              v-if="step > 1"
              color="primary"
              @click="previous()"
              :label="$t('setup.back')"
              class="q-ml-sm"
            />
          </q-stepper-navigation>
          <q-banner
            inline-actions
            class="text-white bg-red"
          >
            {{ $t('setup.seedWarning') }}
          </q-banner>
        </template>
      </q-stepper>
    </div>
  </q-page>
</template>

<script>
import Vue from 'vue'
import VueRouter from 'vue-router'
import { mapActions, mapGetters, mapMutations } from 'vuex'

import { HDPrivateKey } from 'bitcore-lib-cash'
import { generateMnemonic } from 'bip39'

import KeyserverHandler from '../keyserver/handler'
import pop from '../pop'
import { getRelayClient } from '../adapters/vuex-relay-adapter'
import { defaultRelayData, defaultRelayUrl, defaultAvatars } from '../utils/constants'
import { errorNotify } from '../utils/notifications'

import AccountStep from '../components/setup/AccountStep.vue'
import DepositStep from '../components/setup/DepositStep.vue'

// eslint-disable-next-line import/no-webpack-loader-syntax
import WalletGenWorker from 'worker-loader!../workers/xpriv_generate.js'

Vue.use(VueRouter)

export default {
  components: {
    AccountStep,
    DepositStep
  },
  data () {
    return {
      step: 1,
      accountData: {
        name: '',
        valid: false,
        seed: this.getSeedPhrase() || generateMnemonic()
      },
      xPrivKey: null,
      relayData: defaultRelayData,
      relayUrl: defaultRelayUrl,
      avatar: null,
      settings: {
        networking: {
          updateInterval: this.getUpdateInterval() / 1_000
        },
        appearance: {
          darkMode: this.getDarkMode()
        }
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
    selectRandomAvatar () {
      const avatarName = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]
      const toDataURL = (callback) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = function () {
          const canvas = document.createElement('CANVAS')
          const ctx = canvas.getContext('2d')
          canvas.height = this.naturalHeight
          canvas.width = this.naturalWidth
          ctx.drawImage(this, 0, 0)
          const dataURL = canvas.toDataURL()
          callback(dataURL)
        }
        img.src = require(`../assets/avatars/${avatarName}`)
      }
      toDataURL((dataUrl) => {
        this.avatar = dataUrl
      })
    },
    newWallet () {
      this.resetWallet()
      this.$wallet.clearUtxos()

      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.generatingWallet')
      })
      return new Promise((resolve, reject) => {
        // Setup worker
        // TODO: What was the point of doing this in a worker?
        const worker = new WalletGenWorker()
        worker.onmessage = async (event) => {
          try {
            // Prepare wallet
            const xPrivKeyObj = event.data
            this.xPrivKey = HDPrivateKey.fromObject(xPrivKeyObj)
            // TODO: We should not have to update two places.
            this.setXPrivKey(this.xPrivKey)
            this.$wallet.setXPrivKey(this.xPrivKey)
            this.$q.loading.hide()
            resolve()
          } catch (err) {
            reject(err)
          }
        }
        this.seed = this.accountData.seed
        this.setSeedPhrase(this.seed)
        worker.postMessage(this.seed)
      })
    },
    async setupRelayData () {
      // Set profile
      const ksHandler = new KeyserverHandler({ wallet: this.$wallet })
      const idAddress = this.$wallet.myAddress

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.searchingExistingMetaData')
      })

      // Try find relay URL on keyserver
      try {
        const foundRelayUrl = await ksHandler.getRelayUrl(idAddress)
        this.relayUrl = foundRelayUrl

        // No URL entry
        if (!foundRelayUrl) {
          this.relayUrl = defaultRelayUrl
        }
      } catch (err) {
        // No URL found
        if (err.response.status === 404) {
          this.relayUrl = defaultRelayUrl

          this.$refs.stepper.next()
        } else {
          const keyserverErr = new Error(this.$t('setup.errorContactKeyServer'))
          errorNotify(keyserverErr)
        }
      } finally {
        this.$q.loading.hide()
      }

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.searchingRelay')
      })
      // Get profile from relay server
      // We do this first to prevent uploading broken URL to keyserver
      const { client: relayClient } = await getRelayClient({ relayUrl: this.relayUrl, store: this.$store, wallet: this.$wallet })
      try {
        this.relayData = await relayClient.getRelayData(idAddress)
        return
      } catch (err) {
        this.relayData = {
          ...defaultRelayData,
          profile: {
            name: this.accountData.name || 'Stamp User',
            bio: '',
            avatar: this.avatar
          }
        }
        if (!err.response) {
          this.$q.loading.hide()
          // Relay URL malformed
          errorNotify(new Error(this.$t('setup.networkErrorRelayDied')))
          throw err
        }
      } finally {
        this.$q.loading.hide()
      }
    },
    async setUpKeyserver () {
      // Set profile
      const ksHandler = new KeyserverHandler({ wallet: this.$wallet })

      try {
        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.uploadingMetaData')
        })
        const idPrivKey = this.$wallet.identityPrivKey
        await ksHandler.updateKeyMetadata(this.relayUrl, idPrivKey)
        this.$q.loading.hide()
      } catch (err) {
        errorNotify(err)
        throw err
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
        console.log(err)
        errorNotify(new Error(this.$t('setup.networkErrorRelayUnexpected')))
        throw err
      } finally {
        this.$q.loading.hide()
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
        this.$q.loading.hide()
        // TODO: ProfileDialog uses different localization for no particular reason.
        // TODO: move specialization down to errorNotify
        if (err.response.status === 413) {
          errorNotify(new Error(this.$t('setup.profileImageLargeError')))
          throw err
        }
        errorNotify(new Error(this.$t('setup.networkErrorRelayUnexpected')))
        throw err
      } finally {
        this.$q.loading.hide()
      }
      // Apply locally
      this.setRelayData(this.relayData)
      this.setSeedPhrase(this.seed)
    },
    async setupSettings () {
      await this.setUpKeyserver()
      await this.setupRelay()
      await this.updateInterval(this.settings.networking.updateInterval * 1_000)
    },
    next () {
      switch (this.step) {
        case 1:
          this.newWallet()
            .then(() => this.setupRelayData())
            .then(() => this.$refs.stepper.next())
            .catch((err) => errorNotify(err))
          break
        case 2:
          this.setupSettings()
            .then(() => this.$router.push('/'))
            .catch((err) => errorNotify(err))
          break
      }
    },
    previous () {
      this.$refs.stepper.previous()
    }
  },
  computed: {
    ...mapGetters({ balance: 'wallet/balance' }),
    forwardEnabled () {
      if (!this.$electrum.connected) {
        return false
      }
      console.log('isWalletNonEmpty', this.isWalletNonEmpty)
      console.log('isRelayValid', this.isRelayValid)

      switch (this.step) {
        case 1:
          return this.isWalletValid
        case 2:
          return this.isRelayValid && this.isWalletNonEmpty
        default:
          return true
      }
    },
    isWalletValid () {
      return this.accountData.valid
    },
    isRelayValid () {
      console.log('name', this.relayData.profile.name)
      console.log('avatar', !!this.relayData.profile.avatar)
      console.log('price', this.relayData.inbox.acceptancePrice)
      return !!(this.relayData.profile.name && this.relayData.profile.avatar && this.relayData.inbox.acceptancePrice)
    },
    isWalletNonEmpty () {
      return !!this.balance
    },
    nextButtonLabel () {
      switch (this.step) {
        case 1:
          return this.$t('setup.accountSetupNext')
        case 2:
          return this.$t('setup.depositStepNext')
        default:
          return 'Unknown'
      }
    }
  },
  created () {
    // Reset all messaging
    this.resetChats()
    this.selectRandomAvatar()
  }
}
</script>
