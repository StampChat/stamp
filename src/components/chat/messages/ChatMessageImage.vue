<template>
  <div class='q-ml-sm'>
    <q-dialog v-model="imageDialog">
      <image-dialog :image="image" />
    </q-dialog>

    <q-img
      :src="image"
      contain
      style="width: 10vw;"
      @click="()=> showImageDialog(image)"
    />
  </div>
</template>

<script>
import ImageDialog from '../../../components/dialogs/ImageDialog'

export default {
  props: ['image'],
  components: {
    ImageDialog
  },
  data () {
    return {
      imageDialog: false
    }
  },
  methods: {
    showImageDialog (image) {
      this.image = image
      this.imageDialog = true
    }
  },
  created () {
    console.log('hello')
  }
}
</script>
