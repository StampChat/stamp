<template>
  <div class="col q-gutter-y-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> Tweak Settings </div>
      </q-card-section>
      <q-card-section>
        <settings v-bind:value="innerData" @input="settingsChanged"/>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import Settings from '../Settings'

export default {
  components: {
    Settings
  },
  model: {
    prop: 'settingsData',
    event: 'input'
  },
  props: {
    settingsData: Object
  },
  data () {
    return {
      innerData: this.settingsData
    }
  },
  methods: {
    settingsChanged (value) {
      console.log(value)
      this.$emit('input', this.value)
    }
  }
}
</script>
