<template>
  <q-footer elevated>
    <q-bar>
      <q-space />
      <q-btn
        flat
        :color="connected?'white':'negative'"
        :icon="connected?'account_balance_wallet':'error'"
        label="Wallet"
      />
      <q-btn-toggle
        push
        rounded
        v-model="toggleModel"
        color="primary"
        toggle-color="white"
        toggle-text-color="primary"
        :options="[
          {label: 'Basic', value: 'basic' },
          {label: 'Advanced', value: 'advanced' },
        ]"
      />
    </q-bar>
  </q-footer>
</template>

<script>
export default {
  model: {
    prop: 'isBasic',
    event: 'input'
  },
  props: {
    isBasic: Boolean
  },
  computed: {
    connected () {
      return this.$electrum.connected
    },
    toggleModel: {
      get () {
        return this.isBasic ? 'basic' : 'advanced'
      },
      set (v) {
        this.$emit('input', v === 'basic')
      }
    }
  }
}
</script>
