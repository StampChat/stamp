<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">Settings</div>
    </q-card-section>

    <settings v-model="settings"/>

    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        label="Save"
        color="primary"
        v-close-popup
        @click="save()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import Settings from '../settings/Settings.vue'

export default {
  components: {
    Settings
  },
  data () {
    return {
      settings: {
        networking: {
          updateInterval: this.getUpdateInterval() / 1_000
        }
      }
    }
  },
  methods: {
    ...mapGetters({ getUpdateInterval: 'contacts/getUpdateInterval' }),
    ...mapActions({
      updateInterval: 'contacts/setUpdateInterval'
    }),
    save () {
      this.updateInterval(this.settings.networking.updateInterval * 1_000)
    }
  }
}
</script>
