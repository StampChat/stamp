<template>
  <div>
    <q-chat-message
      v-if="isText"
      class="q-py-sm"
      :avatar="contact.avatar"
      :text="[text]"
      :sent="message.outbound"
      :stamp="timeStamp"
    />
    <q-chat-message
      v-else-if="isImage"
      class="q-py-sm"
      :avatar="contact.avatar"
      :sent="message.outbound"
      :stamp="timeStamp"
    >
      <div class='col'>
        <div class='row q-pb-sm'>
          <q-img :src="message.body.image" />
        </div>
        <q-separator v-if="text !== ''" />
        <div
          v-if="text !== ''"
          class='row q-pt-sm'
        >
          {{text}}
        </div>
      </div>
    </q-chat-message>
    <q-chat-message
      v-else
      class="q-py-sm"
      :avatar="contact.avatar"
      :sent="message.outbound"
      :stamp="timeStamp"
    >
      <div class='col'>
        <div class='row q-pb-sm'>
          <div class='col-auto'>
            <q-icon
              name='attach_money'
              size='md'
              dense
              color='green'
            />
          </div>
          <div class='col q-px-sm q-pt-sm'>
            Sent {{ message.body.amount }} satoshis
          </div>
        </div>
        <q-separator v-if="text !== ''" />
        <div
          v-if="text !== ''"
          class='row q-pt-sm'
        >
          {{text}}
        </div>
      </div>
    </q-chat-message>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  methods: {
    ...mapGetters(['getUnixTime']),
    ...mapActions(['updateClock']),
    unixToStamp (unixTime, dateNow) {
      let nowTs = Math.floor(dateNow / 1000)
      let seconds = nowTs - unixTime

      if (seconds > 2 * 24 * 3600) {
        return 'a few days ago'
      }
      if (seconds > 24 * 3600) {
        return 'yesterday'
      }
      if (seconds > 3600) {
        return 'a few hours ago'
      }
      if (seconds > 1800) {
        return 'half an hour ago'
      }
      if (seconds > 120) {
        return Math.floor(seconds / 60) + ' minutes ago'
      }
      if (seconds > 60) {
        return '1 minute ago'
      }
      return 'just now'
    }
  },
  computed: {
    timeStamp () {
      let unixTime = this.getUnixTime()
      let stamp = this.unixToStamp(this.message.timestamp, unixTime)
      return stamp
    },
    isText () {
      return this.message.type === 'text'
    },
    isImage () {
      return this.message.type === 'image'
    },
    text () {
      if (this.message.type === 'text') {
        return this.message.body
      } else if (this.message.type === 'stealth') {
        return this.message.body.memo
      } else if (this.message.type === 'image') {
        return this.message.body.caption
      } else {
        return 'Unknown'
      }
    }
  },
  created () {
    this.updateClock()
  },
  props: ['message', 'contact']
}
</script>
