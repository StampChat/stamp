<template>
  <div
    class="q-mb-sm"
  >
    <q-banner
      rounded
      :class="[this.colors.banner, 'text-center']"
    >
      <q-icon
        name="local_florist"
        size="sm"
      />
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
    }
    /* ,
    name: {
      type: String,
      required: true
    },
    outbound: {
      type: Boolean,
      required: true
    }
    */
  },
  data () {
    return {
      colors: {
        banner: (this.$q.dark.isActive ? 'bg-pink-10' : 'bg-pink-2')
      }
    }
  },
  /*
  computed: {
    stealthDirection () {
      return this.outbound ? 'sent' : 'received'
    },
    message () {
      return (this.outbound ? 'You sent ' : this.name + ' sent you ') + this.formatSats(this.amount)
    }
  },
  */
  methods: {
    formatSats (value) {
      return formatBalance(value)
    }
  }
}
</script>
