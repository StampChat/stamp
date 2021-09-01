<template>
  <q-banner
    rounded
    class="bg-grey-3"
  >
    You received
    <q-icon
      name="local_florist"
      size="sm"
      dense
    />
    {{ formatSats(amount) }}
  </q-banner>
</template>

<script>
import { formatBalance } from '../../../utils/formatting'

export default {
  props: {
    amount: {
      type: Number,
      required: true
    }
  },
  data () {
    return {
      imageDialog: false,
      image: null
    }
  },
  methods: {
    formatSats (value) {
      return formatBalance(value)
    }
  }
}
</script>
