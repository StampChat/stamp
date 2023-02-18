<template>
  <q-card class="q-px-sm q-pb-md dialog-medium">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">
        {{ $t('sendFileDialog.sendFile') }}
      </div>
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
        filled
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
        :hint="$t('sendFileDialog.captionHint')"
        :placeholder="$t('sendFileDialog.captionPlaceholder')"
      />
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('sendFileDialog.cancelBtnLabel')"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :label="$t('sendFileDialog.sendBtnLabel')"
        color="primary"
        v-close-popup
        :disable="filePath === null"
        @click="sendImage"
      />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import assert from 'assert'
import { defineComponent } from 'vue'

import { useChatStore } from 'src/stores/chats'

export default defineComponent({
  setup() {
    const chatStore = useChatStore()
    return {
      getStampAmount: chatStore.getStampAmount,
    }
  },
  props: {
    address: {
      type: String,
      default: '',
    },
    file: {
      type: File,
      default: null,
    },
  },
  data() {
    return {
      caption: '',
      filePath: null as File | null,
      image: null as string | ArrayBuffer | null,
    }
  },
  created() {
    if (this.file) {
      this.filePath = this.file
    }
  },
  methods: {
    async sendImage() {
      if (!this.image) {
        console.error('Attempting to send null image', this.image)
        return
      }
      const stampAmount = this.getStampAmount(this.address)
      assert(typeof this.image === 'string', 'image not properly a string?')
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
        this.image = evt.target?.result ?? null
      }
    },
  },
})
</script>
