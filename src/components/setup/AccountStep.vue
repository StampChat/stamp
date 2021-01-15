<template>
  <div class="col q-gutter-y-md">
    <div v-if="action === 'none'">
      <div class="row q-ma-xs q-ma-xs">
        <q-space />
        <q-btn
          class="q-ma-xs q-ma-xsrow"
          color="primary"
          label="New Character"
          @click="newCharacter"
        />
        <q-space />
      </div>
      <div class="row q-ma-xs q-ma-xs">
        <q-space />
        <q-btn
          class="row q-ma-xs q-ma-xs "
          color="primary"
          label="Import Character"
          @click="importCharacter"
        />
        <q-space />
      </div>
    </div>

    <div v-if="action !== 'none'">
      <q-input
        v-if="action === 'new'"
        v-model="name"
        filled
        :label="$t('profile.name')"
        lazy-rules
        style="width:100%"
        :rules="[ val => !!val || val.length > 0 || $t('profile.pleaseType') ]"
      />
      <q-input
        :readonly="action === 'new'"
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
        v-if="action === 'new'"
        flat
        class="q-pa-xs q-ma-none"
        color="primary"
        icon="content_copy"
        @click="copySeed"
      />
      <q-btn
        v-if="action === 'new'"
        flat
        class="q-pa-xs q-ma-none"
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
      action: 'none'
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
    },
    newCharacter () {
      this.generateMnemonic()
      this.action = 'new'
      this.name = ''
    },
    importCharacter () {
      this.action = 'import'
      this.seed = ''
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
      if (this.action === 'new') {
        return this.accountData.name.length > 0 && this.isSeedValid
      }
      if (this.action === 'import') {
        return this.isSeedValid
      }
      return false
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
