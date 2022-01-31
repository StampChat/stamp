<template>
  <div
    class="q-mb-sm"
  >
    <q-banner
      rounded
      :class="[bannerColor, 'text-center']"
    >
      <q-icon
        name="local_florist"
        size="sm"
      />
      You {{ stealthDirection }}
      {{ formatSats(amount) }}
    </q-banner>
  </div>
</template>

<script>
import { formatBalance } from '../../../utils/formatting'

export default {
  props: {
    amount: {
      type: Number,
      required: true
    },
    outbound: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    stealthDirection () {
      return this.outbound ? 'sent' : 'received'
    },
    // Better theme-based colors for stealth messages
    bannerColor () {
      if (this.$q.dark.isActive) {
        return 'bg-grey-9'
      } else {
        return 'bg-grey-3'
      }
    }
  },
  methods: {
    formatSats (value) {
      return formatBalance(value)
    }
  }
}
</script>
