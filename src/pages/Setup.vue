<template>
  <div>
    <q-header>
      <q-toolbar class="q-pl-sm">
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="$emit('toggleMyDrawerOpen')"
          icon="menu"
        />
        <q-toolbar-title class="h6">
          {{ $t('setup.welcome') }}
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="q-ma-none q-pa-sm">
        <q-stepper
          v-model="step"
          ref="stepper"
          color="primary"
          contracted
          alternative-labels
        >
          <q-step
            :name="1"
            :title="$t('setup.eula')"
            icon="flaky"
            :done="step > 1"
          >
            <eula-step />
          </q-step>
          <q-step
            :name="2"
            :title="$t('setup.setupWallet')"
            icon="vpn_key"
            :done="step > 2"
          >
            <account-step v-model:account-data="accountData" />
          </q-step>
          <q-step
            :name="3"
            :title="$t('setup.deposit')"
            icon="attach_money"
            :done="step > 3"
          >
            <deposit-step />
          </q-step>
          <template #navigation>
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
            <q-banner inline-actions class="text-white bg-red">
              {{ $t('setup.seedWarning') }}
            </q-banner>
          </template>
        </q-stepper>
      </q-page>
    </q-page-container>
  </div>
</template>

<script lang="ts">
import assert from 'assert'

import { defineComponent } from 'vue'
import { QStepper } from 'quasar'

import { HDPrivateKey } from 'bitcore-lib-xpi'
import { generateMnemonic } from 'bip39'

import { RegistryHandler } from '../cashweb/registry'
import pop from '../cashweb/pop'
import { getRelayClient } from '../adapters/pinia-relay-adapter'
import {
  defaultRelayUrl,
  defaultAvatars,
  recomendedBalance,
  registrys,
  networkName,
} from '../utils/constants'
import { errorNotify } from '../utils/notifications'

import AccountStep from '../components/setup/AccountStep.vue'
import DepositStep from '../components/setup/DepositStep.vue'
import EulaStep from '../components/setup/EULAStep.vue'

import WalletGenWorker from 'worker-loader!../workers/xpriv_generate'
import { useRelayClientStore } from 'src/stores/relay-client'
import { useWalletStore } from 'src/stores/wallet'
import { useChatStore } from 'src/stores/chats'
import { useAppearanceStore } from 'src/stores/appearance'
import { useProfileStore } from 'src/stores/my-profile'
import { defaultRelayData, useContactStore } from 'src/stores/contacts'
import { storeToRefs } from 'pinia'

export default defineComponent({
  components: {
    AccountStep,
    DepositStep,
    EulaStep,
  },
  setup() {
    const relayClient = useRelayClientStore()
    const chats = useChatStore()
    const wallet = useWalletStore()
    const { balance, seedPhrase } = storeToRefs(wallet)
    const appearance = useAppearanceStore()
    const myProfile = useProfileStore()
    const contacts = useContactStore()
    const { updateInterval } = storeToRefs(contacts)
    if (!wallet.seedPhrase) {
      wallet.setSeedPhrase(generateMnemonic())
    }

    return {
      setRelayToken: relayClient.setToken,
      resetChats: chats.reset,
      darkMode: appearance.setDarkMode,
      updateInterval: updateInterval,
      setUpdateInterval: contacts.setUpdateInterval,
      seedPhrase: seedPhrase,
      setRelayData: myProfile.setRelayData,
      resetWallet: wallet.reset,
      setXPrivKey: wallet.setXPrivKey,
      setSeedPhrase: wallet.setSeedPhrase,
      balance: balance,
    }
  },
  data() {
    const wallet = useWalletStore()
    const contacts = useContactStore()

    return {
      step: 1,
      accountData: {
        name: '',
        valid: false,
        seed: wallet.seedPhrase,
      },
      relayData: defaultRelayData,
      relayUrl: defaultRelayUrl,
      avatar: '',
      seed: '',
      settings: {
        networking: {
          updateInterval: contacts.updateInterval / 1_000,
        },
      },
    }
  },
  emits: ['setupCompleted', 'toggleMyDrawerOpen'],
  methods: {
    selectRandomAvatar() {
      const avatarName =
        defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]
      const toDataURL = (callback: (dataURL: string) => void) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = function () {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.height = img.naturalHeight
          canvas.width = img.naturalWidth
          ctx?.drawImage(img, 0, 0)
          const dataURL = canvas.toDataURL()
          callback(dataURL)
        }
        img.src = require(`../assets/avatars/${avatarName}`)
      }
      toDataURL((dataUrl: string) => {
        this.avatar = dataUrl
      })
    },
    newWallet() {
      this.resetWallet()
      this.$wallet.clearUtxos()

      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.generatingWallet'),
      })
      return new Promise<void>((resolve, reject) => {
        // Setup worker
        // TODO: What was the point of doing this in a worker?
        const worker = new WalletGenWorker()
        worker.onmessage = async event => {
          try {
            // Prepare wallet
            const xPrivKeyObj = event.data
            const xPrivKey = HDPrivateKey.fromObject(xPrivKeyObj)
            // TODO: We should not have to update two places.
            this.setXPrivKey(xPrivKey)
            this.$wallet.setXPrivKey(xPrivKey)

            this.$q.loading.hide()
            resolve()
          } catch (err) {
            reject(err)
          }
        }
        assert(
          this.accountData.seed,
          'Missing seed phrase? State ordering issue?',
        )
        this.seed = this.accountData.seed
        this.setSeedPhrase(this.seed)
        worker.postMessage(this.seed)
      })
    },
    async setupRelayData() {
      // Set profile
      const ksHandler = new RegistryHandler({
        wallet: this.$wallet,
        registrys: registrys,
        networkName,
      })
      const idAddress = this.$wallet.myAddress?.toCashAddress() ?? ''

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.searchingExistingMetaData'),
      })

      // Try find relay URL on registry
      try {
        const foundRelayUrl = await ksHandler.getRelayUrl(idAddress)
        this.relayUrl = foundRelayUrl ?? defaultRelayUrl
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        // No URL found
        if (err.response && err.response.status === 404) {
          this.relayUrl = defaultRelayUrl
          const stepper = this.$refs.stepper as QStepper
          stepper.next()
        } else {
          const registryErr = new Error(this.$t('setup.errorContactRegistry'))
          errorNotify(registryErr)
        }
      } finally {
        this.$q.loading.hide()
      }

      // Check for existing metadata
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.searchingRelay'),
      })
      // Get profile from relay server
      // We do this first to prevent uploading broken URL to registry
      const { client: relayClient } = await getRelayClient({
        relayUrl: this.relayUrl,
        wallet: this.$wallet,
      })
      try {
        this.relayData = await relayClient.getRelayData(idAddress)
        return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        this.relayData = {
          ...defaultRelayData,
          profile: {
            ...defaultRelayData.profile,
            name: this.accountData.name || 'Stamp User',
            avatar: this.avatar,
          },
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
    async setUpRegistry() {
      // Set profile
      const ksHandler = new RegistryHandler({
        wallet: this.$wallet,
        networkName,
        registrys: registrys,
      })

      try {
        this.$q.loading.show({
          delay: 100,
          message: this.$t('setup.uploadingMetaData'),
        })
        const idPrivKey = this.$wallet.identityPrivKey

        assert(idPrivKey, 'Wallet not initialized')

        console.log('Updating registry metadata')
        await ksHandler.updateKeyMetadata(this.relayUrl, idPrivKey)
        console.log('Metadata updated')

        this.$q.loading.hide()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        errorNotify(err)
        throw err
      } finally {
        this.$q.loading.hide()
      }
    },
    async setupRelay() {
      const { client: relayClient } = await getRelayClient({
        relayUrl: this.relayUrl,
        wallet: this.$wallet,
      })

      // Set filter
      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.requestingPayment'),
      })

      const idAddress = this.$wallet.myAddress
      assert(idAddress, 'idAddress should be defined at this point')

      // We might have spent our only UTXO above, so this will possibly take a few tries.
      let triesLeft = 3
      while (triesLeft > 0) {
        try {
          const relayPaymentRequest = await relayClient.profilePaymentRequest(
            idAddress.toCashAddress().toString(),
          )
          assert(
            relayPaymentRequest,
            'relayPaymentRequest should be defined at this point',
          )
          // Send payment
          this.$q.loading.show({
            delay: 100,
            message: this.$t('setup.sendingPayment'),
          })

          console.log('Constructing relay payment transaction')
          // Get token from relay server
          const { paymentUrl, payment, usedUtxos } =
            await pop.constructPaymentTransaction(
              this.$wallet,
              relayPaymentRequest.paymentDetails,
            )

          const paymentUrlFull = new URL(paymentUrl, this.relayUrl)
          console.log('Sending relay profile payment to', paymentUrlFull.href)
          try {
            const { token } = await pop.sendPayment(
              paymentUrlFull.href,
              payment,
            )
            relayClient.setToken(token)
            this.setRelayToken(token)
            this.$relayClient.setToken(token)
          } catch (err) {
            console.log('Relay payment failed')
            this.$wallet.fixUtxos(usedUtxos)
            throw err
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          // TODO: errors should not be stringly typed. Fix this
          // later. Also retry here should be more explicit. This is
          // basically so that things work when the person only had one UTXO to begin with.
          if (err.message === 'insufficient funds') {
            console.log('insufficient funds')
            triesLeft--
            await new Promise<void>(resolve => {
              setTimeout(() => resolve(), 1000)
            })
            continue
          }
          console.log(err)
          throw err
        } finally {
          this.$q.loading.hide()
        }
        // We succeeded
        break
      }

      // Create metadata
      const idPrivKey = this.$wallet.identityPrivKey
      assert(idPrivKey, 'idPrivKey should be defined at this point')

      const acceptancePrice = this.relayData.inbox.acceptancePrice

      this.$q.loading.show({
        delay: 100,
        message: this.$t('setup.openingInbox'),
      })

      try {
        await this.$relayClient.updateProfile(
          idPrivKey,
          this.relayData.profile,
          acceptancePrice,
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err)
        this.$q.loading.hide()
        // TODO: ProfileDialog uses different localization for no particular reason.
        // TODO: move specialization down to errorNotify
        if (err.response?.status === 413) {
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
    async setupSettings() {
      // Reset all messaging
      await this.resetChats()
      await this.setUpRegistry()
      await this.setupRelay()
      await this.setUpdateInterval(
        this.settings.networking.updateInterval * 1_000,
      )
      await this.$emit('setupCompleted')
    },
    next() {
      const stepper = this.$refs.stepper as QStepper

      switch (this.step) {
        case 1:
          stepper.next()
          break
        case 2:
          this.selectRandomAvatar()
          this.newWallet()
            .then(() => this.setupRelayData())
            .then(() => stepper.next())
            .catch(err => errorNotify(err))
          break
        case 3:
          this.setupSettings()
            .then(() => this.$router.push('/'))
            .catch(err => errorNotify(err))
          break
      }
    },
    previous() {
      const stepper = this.$refs.stepper as QStepper
      stepper.previous()
    },
  },
  computed: {
    forwardEnabled() {
      if (!this.$indexer.connected) {
        return false
      }
      console.log('isWalletValid', this.isWalletValid)
      console.log('isWalletSufficient', this.isWalletSufficient)
      console.log('isRelayValid', this.isRelayValid)

      switch (this.step) {
        case 2:
          return this.isWalletValid
        case 3:
          return this.isRelayValid && this.isWalletSufficient
        default:
          return true
      }
    },
    isWalletValid(): boolean {
      return this.accountData.valid
    },
    isRelayValid(): boolean {
      console.log('name', this.relayData.profile.name)
      console.log('avatar', !!this.relayData.profile.avatar)
      console.log('price', this.relayData.inbox.acceptancePrice)
      return !!(
        this.relayData.profile.name &&
        this.relayData.profile.avatar &&
        this.relayData.inbox.acceptancePrice
      )
    },
    isWalletSufficient() {
      return !!this.balance && this.balance >= recomendedBalance
    },
    nextButtonLabel(): string {
      switch (this.step) {
        case 1:
          return this.$t('agree')
        case 2:
          return this.$t('setup.accountSetupNext')
        case 3:
          return this.$t('setup.depositStepNext')
        default:
          return 'Unknown'
      }
    },
  },
})
</script>

function useApperanceStore() { throw new Error('Function not implemented.') }
function useApperanceStore() { throw new Error('Function not implemented.') }
