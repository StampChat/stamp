<template>
  <div class="column full-height">
    <!-- Send Lotus dialog -->
    <q-dialog v-model="sendBitcoinOpen">
      <send-lotus-dialog :address="address" :contact="contact.profile" />
    </q-dialog>

    <!-- TODO: Renable these features at a later data. They don't work correctly, but were only for demo purposes. -->

    <!-- Clear history dialog -->
    <!-- <q-dialog v-model="confirmClearOpen">
      <clear-history-dialog
        :address="address"
        :name="contact.profile.name"
      />
    </q-dialog>-->

    <!-- Delete chat dialog -->
    <!-- <q-dialog v-model="confirmDeleteOpen">
      <delete-chat-dialog
        :address="address"
        :name="contact.profile.name"
      />
    </q-dialog>
    -->

    <!-- Contact card -->
    <contact-card
      :address="address"
      :name="contact.profile.name"
      :avatar="contact.profile.avatar"
      :acceptance-price="contact.inbox.acceptancePrice"
    />

    <!-- Scroll area -->
    <q-scroll-area class="col">
      <q-list padding>
        <q-item>
          <q-item-section avatar>
            <q-icon name="post_add" />
          </q-item-section>
          <q-item-section>Stamp Price</q-item-section>
          <q-item-section>
            <q-input
              dense
              v-model="stampAmount"
              borderless
              input-class="text-right"
              suffix="Lotus"
            />
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="sendBitcoinOpen = true">
          <q-item-section avatar>
            <q-icon name="attach_money" />
          </q-item-section>
          <q-item-section>Send Lotus</q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="() => (notifications = !notifications)"
        >
          <q-item-section avatar>
            <q-icon name="notifications_none" />
          </q-item-section>
          <q-item-section>Notifications</q-item-section>
          <q-item-section side>
            <q-toggle v-model="notifications" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import ContactCard from './ContactCard.vue'
import SendLotusDialog from '../dialogs/SendLotusDialog.vue'
import { useContactStore } from 'src/stores/contacts'
import { useChatStore } from 'src/stores/chats'

export default defineComponent({
  setup() {
    const chatsStore = useChatStore()
    const contactStore = useContactStore()

    return {
      setStampAmount: chatsStore.setStampAmount,
      setNotify: contactStore.setNotify,
      getNotify: contactStore.getNotify,
      getStampAmount: chatsStore.getStampAmount,
    }
  },
  components: {
    ContactCard,
    SendLotusDialog,
  },
  props: {
    address: {
      type: String,
      default: () => '',
    },
    contact: {
      type: Object,
      default: () => ({
        profile: { name: 'Unknown', avatar: '' },
      }),
    },
  },
  computed: {
    notifications: {
      get(): boolean {
        return this.getNotify(this.address) ?? false
      },
      set(value: string) {
        this.setNotify({ address: this.address, value: Boolean(value) })
      },
    },
    stampAmount: {
      get(): string {
        return Number(this.getStampAmount(this.address) / 1000000).toFixed(2)
      },
      set(amount: string) {
        const amountNumber = Number(amount)
        if (isNaN(amountNumber)) {
          return
        }
        this.setStampAmount({
          address: this.address,
          stampAmount: Number(amountNumber) * 1000000,
        })
      },
    },
  },
  data: function () {
    return {
      confirmClearOpen: false,
      confirmDeleteOpen: false,
      sendBitcoinOpen: false,
    }
  },
})
</script>
