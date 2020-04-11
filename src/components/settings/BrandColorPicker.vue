<template>
  <div class="q-pa-md row items-start q-gutter-md" style="min-width: 100%;">
    <div>
      Primary
      <q-color class='picker' v-model="primary" />
    </div>
    <div>
      Secondary
      <q-color class='picker' v-model="secondary" />
    </div>
    <div>
      Accent
      <q-color class='picker' v-model="accent" />
    </div>
    <div>
      Dark
      <q-color class='picker' v-model="dark" />
    </div>
    <div>
      Positive
      <q-color class='picker' v-model="positive" />
    </div>
    <div>
      Negative
      <q-color class='picker' v-model="negative" />
    </div>
    <div>
      Info
      <q-color class='picker' v-model="info" />
    </div>
    <div>
      Warning
      <q-color class='picker' v-model="warning" />
    </div>
  </div>
</template>

<script>
import { colors } from 'quasar'

export default {
  data () {
    return {
      primary: colors.getBrand('primary'),
      secondary: colors.getBrand('secondary'),
      accent: colors.getBrand('accent'),
      dark: colors.getBrand('dark'),
      positive: colors.getBrand('positive'),
      negative: colors.getBrand('negative'),
      info: colors.getBrand('info'),
      warning: colors.getBrand('warning')
    }
  },
  watch: {
    primary (newColor, oldColor) {
      colors.setBrand('primary', newColor)
    },
    secondary (newColor, oldColor) {
      colors.setBrand('secondary', newColor)
    },
    accent (newColor, oldColor) {
      colors.setBrand('accent', newColor)
    },
    dark (newColor, oldColor) {
      colors.setBrand('dark', newColor)
    },
    positive (newColor, oldColor) {
      colors.setBrand('positive', newColor)
    },
    negative (newColor, oldColor) {
      colors.setBrand('negative', newColor)
    },
    info (newColor, oldColor) {
      colors.setBrand('info', newColor)
    },
    warning (newColor, oldColor) {
      colors.setBrand('warning', newColor)
    }
  }
}
</script>

<style lang="sass" scoped>
.picker
  max-width: 250px
</style>
