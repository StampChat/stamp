<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Send File</div>
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
        style="display: none"
      />
      <q-img v-if="image" :src="image" spinner-color="white" />
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
      <q-btn flat label="Cancel" color="primary" v-close-popup />
      <q-btn
        flat
        label="Send"
        color="primary"
        v-close-popup
        :disable="filePath === null"
        @click="sendImage"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: {
    address: {
      type: String,
      default: () => '',
    },
  },
  data() {
    return {
      caption: '',
      filePath: null,
      image: null,
    }
  },
  methods: {
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount',
    }),
    async sendImage() {
      const stampAmount = this.getStampAmount()(this.address)
      await this.$relayClient.sendImage({
        address: this.address,
        image: this.image,
        caption: this.caption,
        stampAmount,
      })
    },
  },
  watch: {
    filePath(val) {
      // TODO: Check it's an image
      if (val == null) {
        return
      }
      const reader = new FileReader()
      reader.readAsDataURL(val)
      reader.onload = evt => {
        this.image = evt.target.result
      }
    },
  },
}
</script>
