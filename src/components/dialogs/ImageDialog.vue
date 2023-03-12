<template>
  <q-img
    :src="image"
    native-context-menu
    @mouseenter="showBtn = true"
    @mouseleave="showBtn = false"
  >
    <div v-if="showBtn" class="absolute-bottom all-pointer-events">
      <q-btn
        size="md"
        class="float-right"
        color="primary"
        :label="$t('close')"
        v-close-popup
      />
    </div>
  </q-img>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    image: {
      type: String,
      default: () => '',
    },
  },
  data() {
    return {
      showBtn: false,
    }
  },
})
</script>
