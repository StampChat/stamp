<template>
  <div class="col q-gutter-y-md">
    <div v-if="action === 'none'">
      <div class="row q-ma-xs q-ma-xs">
        <q-space />
        <q-btn
          class="q-ma-xs q-ma-xsrow"
          color="primary"
          :label="$t('accountStep.newAccount')"
          @click="newAccount"
        />
        <q-space />
      </div>
      <div class="row q-ma-xs q-ma-xs">
        <q-space />
        <q-btn
          class="row q-ma-xs q-ma-xs"
          color="primary"
          :label="$t('accountStep.importAccount')"
          @click="importAccount"
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

<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue'
import { copyToClipboard } from 'quasar'

import { generateMnemonic, validateMnemonic } from 'bip39'
import { seedCopiedNotify } from '../../utils/notifications'

export default defineComponent({
  model: {
    accountData: Object,
  },
  props: {
    accountData: {
      type: Object as PropType<{ name: string; seed: string }>,
      required: true,
    },
  },
  emits: ['update:account-data'],
  setup(props, { emit }) {
    const action = ref('none')
    const rawName = ref(props.accountData.name)
    const rawSeed = ref(props.accountData.seed)
    const isSeedValid = computed(() => {
      return validateMnemonic(rawSeed.value.toLowerCase().trim())
    })
    const isValid = computed(() => {
      if (action.value === 'new') {
        return rawName.value.length > 0 && isSeedValid.value
      }
      if (action.value === 'import') {
        return isSeedValid
      }
      return false
    })
    const seed = computed({
      get() {
        return rawSeed.value
      },
      set(val: string) {
        rawSeed.value = val
        emit('update:account-data', {
          name: rawName,
          seed: rawSeed.value.toLowerCase().trim(),
          valid: isValid,
        })
      },
    })

    const name = computed({
      get() {
        return rawName.value
      },
      set(val: string) {
        rawName.value = val
        emit('update:account-data', {
          name: rawName.value,
          seed: rawSeed.value,
          valid: isValid.value,
        })
      },
    })

    return {
      action,
      rawName,
      rawSeed,
      isSeedValid,
      isValid,
      seed,
      name,
      copySeed() {
        copyToClipboard(seed.value)
          .then(() => {
            seedCopiedNotify()
          })
          .catch(() => {
            // fail
          })
      },
      generateMnemonic() {
        rawSeed.value = generateMnemonic()
      },
      newAccount() {
        action.value = 'new'
        rawName.value = ''
      },
      importAccount() {
        action.value = 'import'
        rawSeed.value = ''
      },
    }
  },
})
</script>
