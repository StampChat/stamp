<template>
  <div
    class="row-auto q-pt-xs text-left"
    v-bind:key="index" v-if="item.type=='stealth'"
  >
    <q-icon name="attach_money" size="sm" dense />
    {{ formatSats(item.amount) }}
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
      return formatBalance(Number(value))
    }
  }
}
</script>
