<template>
  <q-card class="q-ma-sm">
    <q-card-section>
      <div class="text-h6">WARNING!</div>
    </q-card-section>
    <q-card-section>
      <div>
        This will delete all messages from the remove server and consolidate any
        funds associated with them back into your HD wallet.
      </div>
      <div>This cannot be undoned!</div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        @click="cancel"
        :label="$t('wipeWallet.cancel')"
        color="negative"
        class="q-ma-sm"
      />
      <q-btn
        @click="wipeWallet"
        :label="$t('wipeWallet.wipe')"
        color="primary"
        class="q-ma-sm"
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { errorNotify } from '../utils/notifications'
import { mapMutations } from 'vuex'

export default {
  props: {},
  data() {
    return {}
  },
  methods: {
    ...mapMutations({
      deleteMessage: 'chats/deleteMessage',
    }),
    wipeWallet() {
      this.$q.loading.show({
        delay: 100,
        message: this.$t('wipeWallet.spinnerText'),
      })
      this.$relayClient
        .wipeWallet(({ address, payloadDigest, index }) => {
          this.deleteMessage({ address, payloadDigest, index })
        })
        .then(() => this.$q.loading.hide())
        .catch(err => {
          errorNotify(err)
          this.$q.loading.hide()
        })
    },
    cancel() {
      window.history.length > 1 ? this.$router.go(-1) : this.$router.push('/')
    },
  },
}
</script>
