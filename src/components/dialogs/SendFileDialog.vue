<template>
  <q-card
    class="q-px-sm q-pb-md dialog-medium"
  >
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6"> Send File </div>
      <q-space />
      <q-btn
        flat
        round
        icon="attach_file"
        color="primary"
        @click="$refs.filePicker.$el.click()"
      />
    </q-card-section>
    <q-card-section>
      <q-file
        ref="filePicker"
        v-model="filePath"
        filled=""
        style="display:none"
        @input="parseImage"
      />
      <q-img
        v-if="image !== null"
        :src="image"
        spinner-color="white"
      />
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="caption"
        filled
        dense
        hint="Attach a caption to the image."
        placeholder="Enter the caption..."
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        label="Send"
        color="primary"
        v-close-popup
        :disable="filePath===null"
        @click="sendImage"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: ['address'],
  data () {
    return {
      caption: '',
      filePath: null,
      image: null
    }
  },
  methods: {
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount'
    }),
    parseImage () {
      // TODO: Check it's an image
      if (this.filePath == null) {
        return
      }
      const reader = new FileReader()
      reader.readAsDataURL(this.filePath)
      reader.onload = () => {
        this.image = reader.result
      }
    },
    async sendImage () {
      const stampAmount = this.getStampAmount()(this.address)
      await this.$relayClient.sendImage({ address: this.address, image: this.image, caption: this.caption, stampAmount })
    }
  }
}
</script>
