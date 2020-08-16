<template>
  <q-card>
    <q-card-section class="row items-center">
      <q-avatar
        icon="delete"
        color="red"
        text-color="white"
      />
      <span class="q-ml-sm">{{ $t('deleteMessageDialog.message') }}</span>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        :label="$t('deleteMessageDialog.cancel')"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :label="$t('deleteMessageDialog.delete')"
        color="primary"
        v-close-popup
        @click="deleteMessageBoth()"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapMutations } from 'vuex'
export default {
  props: {
    address: {
      type: String,
      required: true
    },
    payloadDigest: {
      type: String,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },
  methods: {
    ...mapMutations({
      deleteMessage: 'chats/deleteMessage'
    }),
    async deleteMessageBoth () {
      // TODO: Move this into wallet API
      // TODO: More private
      // Delete message from relay server
      try {
        await this.$relayClient.deleteMessage(this.payloadDigest)
        // Delete message from relay server
        this.deleteMessage({ address: this.address, payloadDigest: this.payloadDigest, index: this.index })
      } catch (err) {
        console.error(err)
        if (err.response) {
          console.error(err.response)
        }
      }
    }
  }
}
</script>
