<template>
  <div class="col q-gutter-y-md">
    <q-input
      v-model="name"
      filled
      :label="$t('profile.name')"
      lazy-rules
      style="width:100%"
      :rules="[ val => !!val || val.length > 0 || $t('profile.pleaseType') ]"
    />
    <q-input
      v-model="seed"
      ref="seedInput"
      :label="$t('profile.seedEntry')"
      type="textarea"
      filled
      rows="2"
      lazy-rules
      :rules=" [ val => isSeedValid || $t('profile.invalidSeed') ]"
      :placeholder="$t('profile.enterSeed')"
    />
    <q-btn
      flat
      class="q-pa-xs q-ma-none"
      color="primary"
      icon="content_copy"
      @click="copySeed"
    />
    <q-btn
      flat
      class="q-pa-xs q-ma-none"
      color="primary"
      icon="refresh"
      @click="generateMnemonic"
    />
    <q-btn
      class="q-ma-xs q-ma-xs"
      color="primary"
      :label="$t('profile.importSeed')"
      @click="pasteImported"
    />
  </div>
</template>

<script>
import { generateMnemonic, validateMnemonic } from 'bip39'
import { copyToClipboard } from 'quasar'
import { seedCopiedNotify } from '../../utils/notifications'

export default {
  model: {
    prop: 'accountData',
    event: 'input'
  },
  props: {
    accountData: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      importSeed: false
    }
  },
  methods: {
    generateMnemonic () {
      this.seed = generateMnemonic()
    },
    copySeed () {
      copyToClipboard(this.seed).then(() => {
        seedCopiedNotify()
      }).catch(() => {
        // fail
      })
    },
    pasteImported () {
      const el = document.createElement('textarea')
      document.body.appendChild(el)
      el.focus()
      this.seed = ''
      document.body.removeChild(el)
      this.$nextTick(() => this.$refs.seedInput.select())
    }
  },
  computed: {
    seed: {
      get () {
        return this.accountData.seed
      },
      set (val) {
        console.log('seed', val)
        this.accountData.seed = val.toLowerCase().trim()
        this.accountData.valid = this.isValid
        console.log(this.accountData)
        this.$emit('input', this.accountData)
      }
    },
    isValid () {
      return this.isSeedValid && (this.accountData.name.length > 1)
    },
    isSeedValid () {
      return validateMnemonic(this.seed.toLowerCase().trim())
    },
    name: {
      get () {
        return this.accountData.name
      },
      set (val) {
        this.accountData.name = val
        this.accountData.valid = this.isValid
        this.$emit('input', this.accountData)
      }
    }
  }
}
</script>
