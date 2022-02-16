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
    <q-img
      class="q-mb-sm"
      width="100%"
      :src="image"
      @click="showImageDialog"
    />
  </template>
</template>

<script>
import ImageDialog from '../../../components/dialogs/ImageDialog'

export default {
  props: {
    image: {
      type: String,
      default: () => ''
    },
    isReply: {
      type: Boolean,
      default: () => false
    }
  },
  components: {
    ImageDialog
  },
  data () {
    return {
      imageDialog: false

    }
  },
  methods: {
    showImageDialog () {
      this.imageDialog = true
    }
  }
}
</script>
