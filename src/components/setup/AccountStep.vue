<template>
  <div class="col q-gutter-y-md">
    <q-input
      v-model="name"
      class="q-pa-xs"
      filled
      :label="$t('profile.name')"
      lazy-rules
      style="width:100%"
      :rules="[ val => !!val || val.length > 0 || $t('profile.pleaseType') ]"
    >
      <template v-slot:after>
        <q-btn
          class="q-ma-xs q-ma-xs"
          flat
          color="primary"
          label="Import"
          @click="toggleImport"
        />
      </template>
    </q-input>
    <div v-if="!importSeed">
      <q-input
        class="q-pa-xs"
        v-model="seed"
        :label="$t('profile.seedEntry')"
        type="textarea"
        filled
        rows="2"
        lazy-rules
        :rules=" [ val => isSeedValid || $t('profile.invalidSeed') ]"
        :placeholder="$t('profile.enterSeed')"
      />
      <q-btn
        class="q-pa-xs q-ma-none"
        round
        flat
        color="primary"
        icon="content_copy"
        @click="copySeed"
      />
      <q-btn
        class="q-pa-xs q-ma-none"
        round
        flat
        color="primary"
        icon="refresh"
        @click="generateMnemonic"
      />
    </div>
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
    toggleImport () {
      this.importSeed = true
    }
  },
  computed: {
    seed: {
      get () {
        return this.accountData.seed
      },
      set (val) {
        console.log('seed', val)
        this.accountData.seed = val
        this.accountData.valid = this.isValid
        console.log(this.accountData)
        this.$emit('input', this.accountData)
      }
    },
    isValid () {
      return this.isSeedValid && (this.accountData.name.length > 1)
    },
    isSeedValid () {
      return validateMnemonic(this.seed.trim())
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
