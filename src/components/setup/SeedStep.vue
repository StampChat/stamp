<template>
  <div class="col q-gutter-y-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> What is a Wallet? </div>
      </q-card-section>
      <q-card-section class="text-body2">
        A wallet is a way of storing Bitcoin addresses. The <strong>Stamp wallet</strong> will contain your <strong>identity address</strong>, which allows you to be contacted by your friends,
        and your <strong>deposit addresses</strong>, which allows for direct payments. <br> <br>

        To create a wallet we use a <strong>seed phrase</strong>, this can be thought of as the username and password to your wallet. You may generate a new seed or import an existing one. <br> <br>

        <span class="text-bold">Warning:</span> Forgetting this seed phrase will result in the loss of your identity and money.

        Do not overestimate your ability to remember passphrases especially when you may not use it very often.
      </q-card-section>
    </q-card>
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> Select a Seed </div>
      </q-card-section>
      <q-card-section>
        <q-splitter
          :value=110
          unit="px"
          disable
        >
          <template v-slot:before>
            <q-tabs
              v-model="tab"
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
              v-model="tab"
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
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { copyToClipboard } from 'quasar'
import { seedCopiedNotify } from '../../utils/notifications'

const bip39 = require('bip39')

export default {
  props: {
    // value: {
    // type: 'new',
    // importedSeed: '',
    // valid: false
    // generatedSeed: '',
    // }
    value: Object
  },
  data () {
    return {
      generatedSeed: bip39.generateMnemonic(),
      importedSeed: this.value.importedSeed,
      tab: this.value.type
    }
  },
  methods: {
    copyGenerated () {
      copyToClipboard(this.generatedSeed).then(() => {
        seedCopiedNotify()
      })
        .catch(() => {
          // fail
        })
    },
    nextMnemonic () {
      this.generatedSeed = bip39.generateMnemonic()
      this.$emit('input', this.computedValues)
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
    isImportedValid () {
      return bip39.validateMnemonic(this.importedSeed)
    },
    computedValues () {
      return {
        type: this.tab,
        importedSeed: this.importedSeed,
        valid: this.isImportedValid,
        generatedSeed: this.generatedSeed
      }
    }
  },
  watch: {
    tab (newTab, oldTab) {
      this.$emit('input', this.computedValues)
    },
    importedSeed (newSeed, oldSeed) {
      this.$emit('input', this.computedValues)
    }
  },
  created () {
    this.$emit('input', this.computedValues)
  }
}
</script>
