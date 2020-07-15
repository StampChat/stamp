<template>
  <div>
    <q-icon
      name="attach_money"
      size="sm"
      dense
    />
    {{ formatSats(amount) }}
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
