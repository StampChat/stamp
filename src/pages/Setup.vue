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
          <p>It seems you don't have any accounts setup right now. We'll guide you through the account creation process.</p>
        </q-step>

        <q-step
          :name="2"
          title="Create/Import a Key"
          icon="vpn_key"
          :done="step > 2"
        >
          <q-list>
            <div class="q-pb-sm">
              <q-expansion-item
                class="shadow-1 overflow-hidden"
                style="border-radius: 30px"
                icon="new_releases"
                label="New Seed"
                header-class="bg-primary text-white"
                expand-icon-class="text-white"
                v-model="generateExpanded"
                @show="importExpanded=false"
              >
                <q-card>
                  <q-slide-transition>
                    <q-banner
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
                  </q-slide-transition>

                  <q-card-section>
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
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </div>
            <div class="q-py-sm">

              <q-expansion-item
                class="shadow-1 overflow-hidden"
                style="border-radius: 30px"
                icon="import_export"
                label="Import Seed"
                header-class="bg-primary text-white"
                expand-icon-class="text-white"
                v-model="importExpanded"
                @show="generateExpanded=false"
              >
                <q-card>
                  <q-card-section>
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

                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </div>

          </q-list>
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
                  @input="val => { avatar = val[0] }"
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
                  :src="avatarRaw"
                  spinner-color="white"
                />
              </div>
            </div>
          </div>
        </q-step>

        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn
              @click="next()"
              color="primary"
              :disable="!canProceedSeed"
              :label="step === 4 ? 'Finish' : 'Continue'"
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
            class="bg-blue-8 text-white q-px-lg"
          >
            Welcome to IRCash!
          </q-banner>
          <q-banner
            v-else-if="step === 2"
            class="bg-blue-8 text-white q-px-lg"
          >
            How would you like to add a key to IRCash? </q-banner>
          <q-banner
            v-else-if="step === 3"
            class="bg-blue-8 text-white q-px-lg"
          >
            Deposit Bitcoin Cash to your messaging wallet...
          </q-banner>
          <q-banner
            v-else
            class="bg-blue-8 text-white q-px-lg"
          >
            Create your profile...
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
import paymentrequest from '../keyserver/paymentrequest_pb'
// eslint-disable-next-line import/no-webpack-loader-syntax
import WalletGenWorker from 'worker-loader!../workers/xpriv_generate.js'

const cashlib = require('bitcore-lib-cash')
const bip39 = require('bip39')

Vue.component(VueQrcode.name, VueQrcode)
Vue.use(VueRouter)

export default {
  data () {
    return {
      step: 1,
      name: '',
      bio: '',
      avatar: null,
      avatarRaw: 'hello',
      generatedWarning: true,
      generatedSeed: '',
      generateExpanded: false,
      importExpanded: false,
      importedSeed: '',
      walletBalance: 0,
      recomendedBalance: 2000,
      paymentAddrCounter: 0,
      xPrivKey: null,
      currentAddress: null
    }
  },
  methods: {
    ...mapActions({ setProfile: 'myProfile/setMyProfile', setXPrivKey: 'wallet/setXPrivKey', updateAddresses: 'wallet/updateAddresses', startListeners: 'wallet/startListeners' }),
    ...mapGetters({ getKsHandler: 'keyserverHandler/getHandler', getMyAddress: 'wallet/getMyAddress', getClient: 'electrumHandler/getClient', getAddresses: 'wallet/getAddresses' }),
    parseImage () {
      if (this.avatar == null) {
        return
      }
      var reader = new FileReader()
      reader.readAsDataURL(this.avatar)
      reader.onload = () => {
        this.avatarRaw = reader.result
      }
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
            await this.setXPrivKey(this.xPrivKey)
            await this.updateAddresses()

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
          // Set profile
          let profile = {
            'name': this.name,
            'bio': this.bio,
            'avatar': this.avatarRaw
          }

          let ksHandler = this.getKsHandler()

          // Request Payment
          this.$q.loading.show({
            delay: 100,
            message: 'Requesting Payment...'
          })

          let idAddress = this.getMyAddress()
          let { paymentRequest, paymentDetails, server } = await ksHandler.getPaymentRequest(idAddress)
          console.log(paymentRequest) // TODO: Validation and logging
          this.$q.loading.show({
            delay: 100,
            message: 'Sending Payment...'
          })

          // Get Outputs
          var totalOutput = 0
          let requestOutputs = paymentDetails.getOutputsList()
          for (let i in requestOutputs) {
            let output = requestOutputs[i]
            totalOutput += output.getAmount()
          }

          let addresses = this.getAddresses()

          // Collect inputs
          let client = this.getClient()
          let utxos = []
          let signingKeys = []
          let fee = 30
          let complete = false
          for (let addr in addresses) {
            let vals = addresses[addr]
            let amount = Math.min(vals.balance, totalOutput)
            if (amount !== 0) {
              let outputs = await client.blockchainAddress_listunspent(addr)
              for (let index in outputs) {
                let value = outputs[index].value
                utxos.push({
                  'txId': outputs[index].tx_hash,
                  'outputIndex': outputs[index].tx_pos,
                  'satoshis': value,
                  'address': addr,
                  'script': cashlib.Script.buildPublicKeyHashOut(addr).toHex()
                })
                signingKeys.push(vals.privKey)
                totalOutput -= value
                if (totalOutput <= -fee) {
                  complete = true
                }
              }
            }
            if (complete) {
              break
            }
          }
          // Construct Transaction
          let transaction = new cashlib.Transaction()

          for (let i in utxos) {
            transaction = transaction.from(utxos[i])
          }
          for (let i in requestOutputs) {
            let script = requestOutputs[i].getScript()
            let satoshis = requestOutputs[i].getAmount()
            let output = new cashlib.Transaction.Output({
              script,
              satoshis
            })
            transaction = transaction.addOutput(output)
          }
          for (let i in signingKeys) {
            transaction = transaction.sign(signingKeys[i])
          }
          let rawTransaction = transaction.toBuffer()
          console.log(rawTransaction)

          // Send payment and receive token
          let payment = new paymentrequest.Payment()
          payment.addTransactions(rawTransaction)
          payment.setMerchantData(paymentDetails.getMerchantData())
          console.log(payment)
          let paymentUrl = paymentDetails.getPaymentUrl()
          let { paymentReceipt, token } = await KeyserverHandler.sendPayment(paymentUrl, payment)
          console.log(paymentReceipt)

          // Construct metadata
          let metadata = KeyserverHandler.constructProfileMetadata(profile)
          await ksHandler.putMetadata(idAddress, server, metadata, token)

          this.setProfile(profile)

          this.$q.loading.hide()

          this.$router.push('/')
          break
        default:
          this.$refs.stepper.next()
      }
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
      var dummy = document.createElement('textarea')
      document.body.appendChild(dummy)
      dummy.value = this.generatedSeed
      dummy.select()
      document.execCommand('copy')
      document.body.removeChild(dummy)
      this.$q.notify({
        message: '<div class="text-center"> Seed copied to clipboard </div>',
        html: true,
        color: 'purple'
      })
    },
    copyAddress () {
      var dummy = document.createElement('textarea')
      document.body.appendChild(dummy)
      dummy.value = this.currentAddress
      dummy.select()
      document.execCommand('copy')
      document.body.removeChild(dummy)
      this.$q.notify({
        message: '<div class="text-center"> Address copied to clipboard </div>',
        html: true,
        color: 'purple'
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
    seed () {
      if (this.generateExpanded) {
        return this.generatedSeed
      } else if (this.importExpanded & this.isImportedValid) {
        return this.importedSeed
      } else {
        return null
      }
    },
    isImportedValid () {
      return bip39.validateMnemonic(this.importedSeed)
    },
    canProceedSeed () {
      if (this.step === 2) {
        return (this.seed !== null) && this.connected
      } else {
        return true
      }
    }
  },
  created () {
    this.nextMnemonic()
  }
}
</script>
