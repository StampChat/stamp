<template>
  <q-page-container>
    <q-page class="q-ma-none q-pa-sm">
      <q-card>
        <q-splitter :model-value="110" unit="px" disable>
          <template #before>
            <q-tabs v-model="tab" vertical class="text-primary">
              <q-tab
                name="networking"
                icon="cloud"
                :label="$t('settings.networking')"
              />
              <q-tab
                name="appearance"
                icon="color_lens"
                :label="$t('settings.appearance')"
              />
            </q-tabs>
          </template>
          <template #after>
            <q-tab-panels
              v-model="tab"
              animated
              swipeable
              vertical
              transition-prev="jump-up"
              transition-next="jump-up"
            >
              <q-tab-panel name="networking">
                <div class="row">
                  <q-input
                    outlined
                    v-model="updateInterval"
                    :label="$t('settings.contactRefreshInterval')"
                    type="number"
                    :hint="$t('settings.contactRefreshIntervalHint')"
                    style="width: 100%"
                    ref="contactRefreshInterval"
                  />
                </div>
              </q-tab-panel>
              <q-tab-panel name="appearance">
                <div class="row">
                  <q-toggle
                    :label="$t('settings.darkMode')"
                    v-model="darkMode"
                  />
                </div>
                <div style="height: 2rem"></div>
                <div class="row">
                  <q-select
                    v-model="locale"
                    :options="localeOptions"
                    :label="$t('settings.languageSelectorCaption')"
                    dense
                    borderless
                    emit-value
                    map-options
                    options-dense
                    style="min-width: 150px"
                  />
                </div>
              </q-tab-panel>
            </q-tab-panels>
          </template>
        </q-splitter>
        <q-card-actions align="right">
          <q-btn
            @click="cancel"
            :label="$t('settings.cancelSettings')"
            color="negative"
            class="q-ma-sm"
          />
          <q-btn
            @click="save"
            :label="$t('settings.saveSettings')"
            color="primary"
            class="q-ma-sm"
          />
        </q-card-actions>
      </q-card>
    </q-page>
  </q-page-container>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n'

import { defineComponent, ref } from 'vue'
import { QInput } from 'quasar'

import { useAppearanceStore } from 'src/stores/appearance'
import { useContactStore } from 'src/stores/contacts'
import { storeToRefs } from 'pinia'
const msToMinutes = 60000

export default defineComponent({
  setup() {
    const { locale, fallbackLocale } = useI18n({ useScope: 'global' })

    const appearanceStore = useAppearanceStore()
    const contactStore = useContactStore()
    const { updateInterval: storeUpdateInterval } = storeToRefs(contactStore)
    const { darkMode: storeDarkMode } = storeToRefs(appearanceStore)

    return {
      darkMode: ref(storeDarkMode.value),
      updateInterval: ref(storeUpdateInterval.value / msToMinutes),
      contactRefreshInterval: ref<QInput | null>(null),
      storeDarkMode,
      storeUpdateInterval,
      locale,
      localeOptions: [
        { value: 'en-us', label: 'English' },
        { value: 'fr-fr', label: 'Français' },
      ],
      lang: fallbackLocale,
    }
  },
  data() {
    return {
      tab: 'networking',
    }
  },
  methods: {
    save() {
      this.storeDarkMode = this.darkMode
      this.$q.dark.set(this.darkMode)
      this.storeUpdateInterval = this.updateInterval * msToMinutes
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
    cancel() {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
  },
  mounted() {
    this.contactRefreshInterval?.focus()
  },
  watch: {
    lang(lang) {
      console.log('## language set to:', lang)
      this.$i18n.locale = lang.value

      import(`quasar/lang/${lang.value}`).then(language => {
        console.log('## language set to:', lang, 'language=', language)
        this.$q.lang.set(language.default)
      })
    },
  },
})
</script>
