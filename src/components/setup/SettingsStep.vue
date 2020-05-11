<template>
  <div class="col q-gutter-y-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold"> Tweak Settings </div>
      </q-card-section>
      <q-card-section>
        <settings v-model="innerSettingsChanged" />
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
    settingsData: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      innerData: this.settingsData
    }
  },
  computed: {
    innerSettingsChanged: {
      get () {
        return this.settingsData
      },
      set (val) {
        this.$emit('input', val)
      }
    }
  }
}
</script>
