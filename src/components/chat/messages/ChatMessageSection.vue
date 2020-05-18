<template>
  <div class='q-ml-sm'>
    <q-dialog v-model="imageDialog">
      <image-dialog :image="image" />
    </q-dialog>

    <template v-for="(item, index) in items">
      <div class="reply row-auto text-left" v-bind:key="index" v-if="item.type=='reply'">
        <div class='text-weight-bold' :style="nameColor"> {{ name }} </div>
        <chat-message-section
          class="row-auto"
          :items="getMessage(item.payloadDigest).items"
          :address="address"
        />
      </div>
      <div
        class="row-auto text-left"
        v-bind:key="index"
        v-if="item.type=='text'"
        v-html = "markedMessage(item.text)"
      >
      </div>
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
import marked from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'chat-message-section',
  props: ['items', 'address', 'outbound', 'nameColor', 'name'],
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
    },
    markedMessage (text) {
      return DOMPurify.sanitize(marked(text))
    }
  },
  filters: {
    marked: marked
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  background: #FFF;
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}
</style>
