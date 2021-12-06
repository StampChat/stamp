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
          class="row q-ma-xs q-ma-xs"
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
        style="width: 100%"
        :rules="[val => !!val || val.length > 0 || $t('profile.pleaseType')]"
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
        :rules="[val => isSeedValid || $t('profile.invalidSeed')]"
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
    accountData: Object,
  },
  props: {
    accountData: {
      type: Object,
      required: true,
    },
  },
  emits: ['update:account-data'],
  data() {
    return {
      action: 'none',
      rawName: this.accountData.name,
      rawSeed: this.accountData.seed,
    }
  },
  methods: {
    generateMnemonic() {
      this.rawSeed = generateMnemonic()
    },
    copySeed() {
      copyToClipboard(this.seed)
        .then(() => {
          seedCopiedNotify()
        })
        .catch(() => {
          // fail
        })
    },
    pasteImported() {
      const el = document.createElement('textarea')
      document.body.appendChild(el)
      el.focus()
      this.seed = ''
      document.body.removeChild(el)
      this.$nextTick(() => this.$refs.seedInput.select())
    },
    newCharacter() {
      this.generateMnemonic()
      this.action = 'new'
      this.rawName = ''
    },
    importCharacter() {
      this.action = 'import'
      this.rawSeed = ''
    },
  },
  computed: {
    seed: {
      get() {
        return this.rawSeed
      },
      set(val) {
        this.rawSeed = val
        this.$emit('update:account-data', {
          name: this.rawName,
          seed: this.rawSeed.toLowerCase().trim(),
          valid: this.isValid,
        })
      },
    },
    isValid() {
      if (this.action === 'new') {
        return this.rawName.length > 0 && this.isSeedValid
      }
      if (this.action === 'import') {
        return this.isSeedValid
      }
      return false
    },
    isSeedValid() {
      return validateMnemonic(this.rawSeed.toLowerCase().trim())
    },
    name: {
      get() {
        return this.rawName
      },
      set(val) {
        this.rawName = val
        this.$emit('update:account-data', {
          name: this.rawName,
          seed: this.rawSeed,
          valid: this.isValid,
        })
      },
    },
  },
}
</script>
