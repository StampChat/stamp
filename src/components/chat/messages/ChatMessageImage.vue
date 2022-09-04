<template>
  <template v-if="isReply">
    <q-img
      fit="cover"
      height="100%"
      width="80px"
      :src="image"
      @click="showImageDialog"
    />
  </template>
  <template v-else>
    <q-dialog v-model="imageDialog">
      <image-dialog :image="image" />
    </q-dialog>
    <q-img class="q-mb-sm" width="100%" :src="image" @click="showImageDialog" />
  </template>
</template>

<script lang="ts">
import { ref } from 'vue'

import ImageDialog from '../../../components/dialogs/ImageDialog.vue'

export default {
  props: {
    image: {
      type: String,
      default: () => '',
    },
    isReply: {
      type: Boolean,
      default: () => false,
    },
  },
  components: {
    ImageDialog,
  },
  setup() {
    const imageDialog = ref(false)
    return {
      showImageDialog() {
        imageDialog.value = true
      },
      imageDialog,
    }
  },
}
</script>
