<template>
  <div class="col q-gutter-y-md">
    <div class="row p-mx-sm text-h6">
      <q-space />
      {{ $t('setup.welcomeToStampChat') }}
      <q-space />
    </div>

    <div class="row q-gutter-y-md">
      {{ $t('setup.eulaDisclaimer') }}
    </div>

    <div class="row q-gutter-y-md">
      {{ $t('setup.eulaYouUnderstand') }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({})
</script>
