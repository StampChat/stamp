<template>
  <div class="q-mb-sm">
    <q-banner rounded :class="[banner, 'text-center']">
      <q-icon name="local_florist" size="sm" />
      {{ formatSats(amount) }}
    </q-banner>
  </div>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { defineComponent } from 'vue'

import { formatBalance } from '../../../utils/formatting'

export default defineComponent({
  props: {
    amount: {
      type: Number,
      required: true,
    },
  },
  setup() {
    const $q = useQuasar()
    return {
      banner: $q.dark.isActive ? 'bg-pink-10' : 'bg-pink-2',
      formatSats(value: number) {
        return formatBalance(value)
      },
    }
  },
})
</script>
