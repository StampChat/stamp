<template>
  <div class='q-ml-sm'>
    <q-dialog v-model="imageDialog">
      <image-dialog :image="image" />
    </q-dialog>

    <template v-for="(item, index) in items">
      <div class="row-auto q-pt-xs text-left rounded-borders" v-bind:key="index" v-if="item.type=='reply'">
        <span class="text-weight-bold">Replying To:</span>
        <chat-message-section
          :class="`q-pa-xs row-auto ${$q.dark.isActive ? 'bg-indigo-10' : 'bg-light-blue-4'}`"
          style="border-radius: 5px;"
          :items="getMessage(item.payloadDigest).items"
          :address="address"
        />
      </div>
      <div
        class="row-auto q-pa-xs text-left"
        v-bind:key="index"
        v-if="item.type=='text'"
      >{{ item.text }}</div>
      <div class="row-auto q-pt-xs text-left" v-bind:key="index" v-if="item.type=='image'">
        <q-img
          :src="item.image"
          contain
          style="width: 10vw;"
          @click="()=> showImageDialog(item.image)"
        />
      </div>
      <div class="row-auto q-pt-xs text-left" v-bind:key="index" v-if="item.type=='stealth'">
        <q-icon name="attach_money" size="sm" dense />
        {{ formatSats(item.amount) }}
      </div>
    </template>
  </div>
</template>

<script>
import { formatBalance } from '../../utils/formatting'
import ImageDialog from '../../components/dialogs/ImageDialog'
import { mapGetters } from 'vuex'

export default {
  name: 'chat-message-section',
  props: ['items', 'address', 'outbound'],
  components: {
    ImageDialog
  },
  data () {
    return {
      imageDialog: false,
      image: null
    }
  },
  methods: {
    ...mapGetters({
      getMessageByPayloadVuex: 'chats/getMessageByPayload'
    }),
    formatSats (value) {
      return formatBalance(Number(value))
    },
    showImageDialog (image) {
      this.image = image
      this.imageDialog = true
    },
    getMessage (payloadDigest) {
      const message = this.getMessageByPayloadVuex()(payloadDigest)
      return message || { items: [] }
    }
  }
}
</script>
