<template>
  <div>
    <div
      class='q-py-sm'
      v-if="item.type=='reply'"
    >
      <div class='q-pa-sm bg-secondary' style='border-radius: 5px;'>
        <chat-message-reply :item="firstItem(getMessage(address, item.payloadDigest))" />
      </div>
    </div>
    <div
      :class="single?'q-py-none':'q-py-sm'"
      v-else-if="item.type=='text'"
    >
      {{ item.text }}
    </div>
    <div
      class='q-py-sm'
      v-else-if="item.type=='image'"
    >
      <!-- Image dialog -->
      <q-dialog v-model="imageDialog">
        <image-dialog :image="item.image" />
      </q-dialog>

      <q-img
        :src="item.image"
        contain
        style="width: 10vw;"
        @click="imageDialog = true"
      />
    </div>
    <div
      class='q-py-sm'
      v-else-if="item.type=='stealth'"
    >
      <div class='col q-pb-xs'>
        <div class='row'>
          <div class='col-auto'>
            <q-icon
              name='attach_money'
              size='md'
              dense
              color='green'
            />
          </div>
          <div class='col q-px-sm q-py-sm'>
            Sent {{ item.amount }} satoshis
          </div>
        </div>
      </div>
    </div>
    <q-separator v-if="!end" />
  </div>
</template>

<script>
import ImageDialog from '../../components/dialogs/ImageDialog'
import ChatMessageReply from './ChatMessageReply'
import { mapGetters } from 'vuex'

export default {
  props: ['item', 'end', 'single', 'address'],
  components: {
    ImageDialog,
    ChatMessageReply
  },
  data () {
    return {
      imageDialog: false
    }
  },
  methods: {
    firstItem (msg) {
      const firstNonReply = msg.items.find(item => item.type !== 'reply')
      return firstNonReply
    }
  },
  computed: {
    ...mapGetters({
      getMessage: 'chats/getMessage'
    })
  }
}
</script>
