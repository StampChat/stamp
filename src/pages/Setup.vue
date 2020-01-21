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
          <p>It seems you don't have any accounts setup right now.</p>
          <p>We'll guide you through the account creation process...</p>
        </q-step>

        <q-step
          :name="2"
          title="Setup Wallet"
          icon="vpn_key"
          :done="step > 2"
        >
          <q-splitter
            :value=110
            unit="px"
            disable
          >
            <template v-slot:before>
              <q-tabs
                v-model="seedTabs"
                vertical
                class="text-primary"
              >
                <q-tab
                  name="new"
                  icon="new_releases"
                  label="New Seed"
                />
                <q-tab
                  name="import"
                  icon="import_export"
                  label="Import Seed"
                />
              </q-tabs>
            </template>
            <template v-slot:after>
              <q-tab-panels
                v-model="seedTabs"
                animated
                transition-prev="jump-up"
                transition-next="jump-up"
              >
                <q-tab-panel name="new">
                  <q-input
                    class="text-bold text-h6"
                    v-model="generatedSeed"
                    filled
                    type="textarea"
                    readonly
                    rows="1"
                  >
                    <q-menu
                      touch-position
                      context-menu
                    >
                      <q-list
                        dense
                        style="min-width: 100px"
                      >
                        <q-item
                          clickable
                          v-close-popup
                          @click="copyGenerated"
                        >
                          <q-item-section>Copy</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-input>
                  <div class="q-pa-md float-right">
                    <q-btn
                      color="primary"
                      flat
                      icon="content_copy"
                      @click="copyGenerated"
                    />
                    <q-btn
                      color="primary"
                      label="Generate"
                      @click="nextMnemonic"
                    />
                  </div>
                </q-tab-panel>

                <q-tab-panel name="import">
                  <q-input
                    class="text-bold text-h6"
                    v-model="importedSeed"
                    filled
                    type="textarea"
                    rows="1"
                    placeholder="Enter a seed phrase..."
                  >
                    <q-menu
                      touch-position
                      context-menu
                    >
                      <q-list
                        dense
                        style="min-width: 100px"
                      >
                        <q-item
                          clickable
                          v-close-popup
                          @click="pasteImported"
                        >
                          <q-item-section>Paste</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                    <template v-slot:after>
                      <q-icon
                        v-show="!isImportedValid"
                        name="warning"
                        class="text-red"
                        size="lg"
                      />
                      <q-icon
                        v-show="isImportedValid"
                        name="check"
                        class="text-green"
                        size="lg"
                      />
                    </template>
                  </q-input>
                </q-tab-panel>
              </q-tab-panels>
            </template>
          </q-splitter>
        </q-step>

        <q-step
          :name="3"
          title="Deposit Bitcoin Cash"
          icon="attach_money"
          style="min-height: 300px;"
          :done="step > 3"
        >
          <div class="row">
            <div class="col">
              <div class="row">
                <p
                  class="text-h4"
                  style="margin: auto; "
                >Deposit Address</p>
              </div>

              <div class="row">
                <qrcode
                  style="margin-left: auto; margin-right: auto;"
                  :value="currentAddress"
                  :options="{width: 300}"
                ></qrcode>
              </div>
              <div class="row">
                <q-input
                  style="margin-left: auto; margin-right: auto; min-width: 500px"
                  filled
                  auto-grow
                  v-model="currentAddress"
                  readonly
                >
                  <template v-slot:after>
                    <q-btn
                      dense
                      color="primary"
                      flat
                      icon="content_copy"
                      @click="copyAddress"
                    />
                    <q-btn
                      dense
                      color="primary"
                      flat
                      icon="refresh"
                      @click="nextAddress"
                    />
                  </template>
                </q-input>
              </div>
            </div>
            <q-separator
              vertical
              inset
            />
            <div class="col">
              <div class="row">
                <p
                  class="text-h4"
                  style="margin: auto; "
                >Current Balance </p>
              </div>

              <div class="row">
                <q-circular-progress
                  style="margin-left: auto; margin-right: auto; margin-top: 50px;"
                  show-value
                  :value="percentageBalance"
                  size="225px"
                  :thickness="0.25"
                  color="green"
                  track-color="grey"
                >
                  <span class="text-h4">{{ formatedBalance }}</span>
                </q-circular-progress>
              </div>
              <div class="row">
                <p
                  class="q-pt-lg text-subtitle1"
                  style="margin: auto;"
                >Recommended {{ recomendedBalance }} satoshi </p>
              </div>
            </div>
          </div>

        </q-step>

        <q-step
          :name="4"
          title="Create a Profile"
          icon="person"
          style="min-height: 300px;"
          :done="step > 4"
        >
          <div class="row">
            <div class="col">
              <div class="row q-pa-md">
                <q-input
                  outlined
                  v-model="name"
                  label="Name *"
                  hint="Name displayed to others"
                  lazy-rules
                  style="width:100%"
                  :rules="[ val => val && val.length > 0 || 'Please type something']"
                />
              </div>
              <div class="row q-pa-md">
                <q-input
                  v-model="bio"
                  label="Bio"
                  hint="Short biolography displayed to others"
                  outlined
                  style="width:100%"
                  autogrow
                />
              </div>
            </div>
            <div class="col-4 q-pa-md">
              <q-toolbar
                class="bg-primary text-white shadow-2"
                style="border-radius: 10px 10px 0px 0px"
              >
                <q-toolbar-title>Upload Avatar</q-toolbar-title>

                <q-input
                  @input="val => { avatarPath = val[0] }"
                  ref="displayPicker"
                  style="display:none"
                  type="file"
                  label="Standard"
                  @change="parseImage"
                />
                <q-btn
                  type="file"
                  flat
                  round
                  dense
                  icon="add_a_photo"
                  @click="$refs.displayPicker.$el.click()"
                />
              </q-toolbar>
              <div>
                <q-img
                  :src="avatarDataURL"
                  spinner-color="white"
                />
              </div>
            </div>
          </div>
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
            <!-- TODO: Switch between labels -->
            <q-btn
              v-else-if="step === 2"
              @click="next()"
              color="primary"
              :label="seedTabs==='new'?'New Wallet':'Import Wallet'"
              :disable="!isConnected"
            />
            <q-btn
              v-else-if="step === 3"
              @click="next()"
              color="primary"
              :disable="!(canProceedSeed && isConnected)"
              label="Continue"
            />
            <q-btn
              v-else
              @click="next()"
              color="primary"
              :disable="!isConnected"
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
import { copyToClipboard } from 'quasar'

// eslint-disable-next-line import/no-webpack-loader-syntax
import WalletGenWorker from 'worker-loader!../workers/xpriv_generate.js'

const cashlib = require('bitcore-lib-cash')
const bip39 = require('bip39')

Vue.component(VueQrcode.name, VueQrcode)
Vue.use(VueRouter)

const relayUrlOptions = ['34.67.137.105:8080', 'bitcoin.com', 'cashweb.io']

export default {
  data () {
    return {
      step: 1,
      name: '',
      bio: '',
      avatarPath: null,
      avatarDataURL: null,
      generatedWarning: true,
      generatedSeed: '',
      importedSeed: '',
      seedTabs: 'new',
      seed: null,
      walletBalance: 0,
      recomendedBalance: 2000,
      paymentAddrCounter: 0,
      xPrivKey: null,
      currentAddress: null,
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
    parseImage () {
      if (this.avatarPath == null) {
        return
      }
      var reader = new FileReader()
      reader.readAsDataURL(this.avatarPath)
      reader.onload = () => {
        this.avatarDataURL = reader.result
      }
    },
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
            let privKey = this.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(0, true)
            this.currentAddress = privKey.privateKey.toAddress('testnet')
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
          if (this.seedTabs === 'new') {
            this.seed = this.generatedSeed
          } else {
            this.seed = this.importedSeed
          }
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
      let profile = {
        'name': this.name,
        'bio': this.bio,
        'avatar': this.avatarDataURL
      }

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
      let metadata = KeyserverHandler.constructProfileMetadata(profile, idPrivKey)

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
    },
    nextMnemonic () {
      this.generatedSeed = bip39.generateMnemonic()
    },
    nextAddress () {
      // Increment address
      this.paymentAddrCounter += 1
      let privKey = this.xPrivKey.deriveChild(44).deriveChild(0).deriveChild(0).deriveChild(this.paymentAddrCounter, true)
      this.currentAddress = privKey.privateKey.toAddress('testnet')
    },
    copyGenerated () {
      copyToClipboard(this.generatedSeed).then(() => {
        this.$q.notify({
          message: '<div class="text-center"> Seed copied to clipboard </div>',
          html: true,
          color: 'purple'
        })
      })
        .catch(() => {
          // fail
        })
    },
    copyAddress () {
      copyToClipboard(this.currentAddress).then(() => {
        this.$q.notify({
          message: '<div class="text-center"> Address copied to clipboard </div>',
          html: true,
          color: 'purple'
        })
      })
        .catch(() => {
          // fail
        })
    },
    pasteImported () {
      var el = document.createElement('textarea')
      document.body.appendChild(el)
      el.focus()
      document.execCommand('paste')
      this.importedSeed = el.value
      document.body.removeChild(el)
    }
  },
  computed: {
    ...mapGetters({ getBalance: 'wallet/getBalance', connected: 'electrumHandler/connected' }),
    percentageBalance () {
      let percentage = 100 * Math.min(this.getBalance / this.recomendedBalance, 1)
      return percentage
    },
    formatedBalance () {
      if (this.getBalance < 1_000) {
        return String(this.getBalance) + ' sats'
      } else if (this.getBalance < 100_000) {
        return String(this.getBalance / 100) + ' uBCH'
      } else if (this.getBalance < 10_000_000) {
        return String(this.getBalance / 100_000) + ' mBCH'
      } else if (this.getBalance < 100_000_000) {
        return String(this.getBalance / 1_000_000) + ' cBCH'
      } else {
        return String(this.getBalance / 1_00_000_000) + ' BCH'
      }
    },
    isImportedValid () {
      return bip39.validateMnemonic(this.importedSeed)
    },
    canProceedSeed () {
      return (this.seed !== null)
    },
    isConnected () {
      return this.connected
    }
  },
  created () {
    this.nextMnemonic()
  }
}
</script>
