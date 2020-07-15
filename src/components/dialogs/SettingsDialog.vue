<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section>
      <div class="text-h6">
        Settings
      </div>
    </q-card-section>

    <settings v-model="settings" />

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
import { mapGetters, mapActions, mapMutations } from 'vuex'
import Settings from '../Settings.vue'

export default {
  components: {
    Settings
  },
  data () {
    return {
      settings: {
        networking: {
          updateInterval: this.getUpdateInterval() / 1_000
        },
        appearance: {
          darkMode: this.getDarkMode()
        }
      }
    }
  },
  methods: {
    ...mapGetters({ getUpdateInterval: 'contacts/getUpdateInterval', getDarkMode: 'appearance/getDarkMode' }),
    ...mapActions({
      darkMode: 'appearance/setDarkMode'
    }),
    ...mapMutations({
      updateInterval: 'contacts/setUpdateInterval'
    }),
    save () {
      this.darkMode(this.settings.appearance.darkMode)
      this.$q.dark.set(this.settings.appearance.darkMode)
      this.updateInterval(this.settings.networking.updateInterval * 1_000)
    }
  }
}
</script>
