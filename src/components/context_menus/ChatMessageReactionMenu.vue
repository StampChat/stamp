<template>
  <q-menu no-focus auto-close context-menu transition-duration="50">
    <q-list :dark="$q.dark.isActive">
      <q-item v-for="(emojiArray, index) in emojis" :key="index" dense>
        <q-item-section
          v-for="(emoji, subIndex) in emojiArray"
          :key="subIndex"
          :class="['q-pa-sm', checkMyReaction(emoji)]"
          style="cursor: default; font-size: 18px"
          @click="sendReaction(emoji)"
        >
          {{ emoji }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script lang="ts">
import { emojiReactions } from '../../utils/constants'
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'ChatMenuReactionMenu',
  data() {
    return {
      emojis: emojiReactions,
    }
  },
  props: {
    address: {
      type: String,
      required: true,
    },
    payloadDigest: {
      type: String,
      required: true,
    },
    myReaction: {
      type: String,
      default: '',
    },
  },
  methods: {
    ...mapGetters({
      getStampAmount: 'chats/getStampAmount',
    }),
    async sendReaction(emoji: string) {
      if (this.checkMyReaction(emoji)) {
        return
      }
      this.$relayClient.sendReaction({
        address: this.address,
        reaction: emoji,
        payloadDigest: this.payloadDigest,
        stampAmount: this.getStampAmount()(this.address),
      })
    },
    checkMyReaction(emoji: string) {
      return this.myReaction == emoji ? ['myReaction', 'disabled'] : null
    },
  },
  computed: {},
})
</script>

<style lang="scss" scoped>
.myReaction {
  background-color: $dark;
  border-radius: 8px;
  border: 1px solid;
}
</style>
