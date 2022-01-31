<template>
  <q-dialog v-model="imageDialog">
    <image-dialog :image="image" />
  </q-dialog>
  <q-img
    :src="image"
    :width="width"
    @click="showImageDialog"
  />
</template>

<script>
import ImageDialog from '../../../components/dialogs/ImageDialog'

export default {
  props: {
    image: {
      type: String,
      default: () => ''
    },
    width: {
      type: String,
      required: false,
      default: () => '300px'
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
