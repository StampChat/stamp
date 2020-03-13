<template>
  <div>
    <q-splitter
      :value=110
      unit="px"
      disable
    >
      <template v-slot:before>
        <q-tabs
          v-model="tab"
          vertical
          class="text-primary"
        >
          <q-tab
            name="appearance"
            icon="wallpaper"
            label="Appearance"
          />
          <q-tab
            name="security"
            icon="fingerprint"
            label="Security"
          />
          <q-tab
            name="backup"
            icon="settings_backup_restore"
            label="Backup"
          />
        </q-tabs>
      </template>
      <template v-slot:after>
        Unimplemented
      </template>
    </q-splitter>
  </div>
</template>

<script>
export default {
  data () {
    return {
      tab: 'appearance'
    }
  }
}
</script>
