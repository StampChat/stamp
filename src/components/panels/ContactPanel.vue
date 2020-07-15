<template>
  <div class="column full-height">
    <!-- Send Bitcoin dialog -->
    <q-dialog
      v-model="sendBitcoinOpen"
      persistent
    >
      <send-bitcoin-dialog
        :address="address"
        :contact="contact.profile"
      />
    </q-dialog>

    <!-- Clear history dialog -->
    <q-dialog
      v-model="confirmClearOpen"
      persistent
    >
      <clear-history-dialog
        :address="address"
        :name="contact.profile.name"
      />
    </q-dialog>

    <!-- Delete chat dialog -->
    <q-dialog
      v-model="confirmDeleteOpen"
      persistent
    >
      <delete-chat-dialog
        :address="address"
        :name="contact.profile.name"
      />
    </q-dialog>

    <!-- Contact book dialog -->
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog
        :contactClick="function (shareAddr, contact) { return shareContact({ currentAddr: address, shareAddr }) }"
      />
    </q-dialog>

    <!-- Contact card -->
    <contact-card
      :address="address"
      :name="contact.profile.name"
      :avatar="contact.profile.avatar"
      :acceptancePrice="contact.inbox.acceptancePrice"
    />

    <!-- Scroll area -->
    <q-scroll-area class="col">
      <q-list padding>
        <q-item>
          <q-item-section avatar>
            <q-icon name="post_add" />
          </q-item-section>
          <q-item-section>
            Stamp Price
          </q-item-section>
          <q-item-section>
            <q-input
              dense
              v-model="stampAmount"
              borderless
              input-class="text-right"
              suffix="sats"
            />
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="sendBitcoinOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="attach_money" />
          </q-item-section>
          <q-item-section>
            Send Bitcoin
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="notifications_none" />
          </q-item-section>
          <q-item-section>
            Notifications
          </q-item-section>
          <q-item-section side>
            <q-toggle v-model="notifications" />
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="contactBookOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="share" />
          </q-item-section>

          <q-item-section>
            Share Contact
          </q-item-section>
        </q-item>

        <q-separator />
        <q-item
          clickable
          v-ripple
          @click="confirmClearOpen = true"
        >
          <q-item-section avatar>
            <q-icon name="clear_all" />
          </q-item-section>

          <q-item-section>
            Clear History
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon
              name="block"
              color="red"
            />
          </q-item-section>

          <q-item-section>
            Block
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          @click="confirmDeleteOpen = true"
        >
          <q-item-section avatar>
            <q-icon
              name="delete"
              color="red"
            />
          </q-item-section>

          <q-item-section>
            Delete
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapGetters, mapActions, mapMutations } from 'vuex'
import ContactCard from './ContactCard.vue'
import ClearHistoryDialog from '../dialogs/ClearHistoryDialog.vue'
import DeleteChatDialog from '../dialogs/DeleteChatDialog.vue'
import ContactBookDialog from '../dialogs/ContactBookDialog.vue'
import SendBitcoinDialog from '../dialogs/SendBitcoinDialog.vue'

Vue.filter('truncate', function (text, length, clamp) {
  clamp = clamp || '...'
  const node = document.createElement('div')
  node.innerHTML = text
  const content = node.textContent
  return content.length > length ? content.slice(0, length) + clamp : content
})

export default {
  components: {
    ContactCard,
    ClearHistoryDialog,
    DeleteChatDialog,
    ContactBookDialog,
    SendBitcoinDialog
  },
  props: ['address', 'contact'],
  methods: {
    ...mapActions({
      shareContact: 'chats/shareContact',
      setStampAmount: 'chats/setStampAmount'
    }),
    ...mapMutations({
      setNotify: 'contacts/setNotify'
    })
  },
  computed: {
    ...mapGetters({
      getNotify: 'contacts/getNotify',
      getStampAmount: 'chats/getStampAmount'
    }),
    notifications: {
      get () {
        return this.getNotify(this.address)
      },
      set (value) {
        this.setNotify({ address: this.address, value })
      }
    },
    stampAmount: {
      get () {
        return this.getStampAmount(this.address)
      },
      set (amount) {
        const amountNumber = Number(amount)
        if (isNaN(amountNumber)) {
          return
        }
        this.setStampAmount({ address: this.address, stampAmount: amountNumber })
      }
    }
  },
  data: function () {
    return {
      confirmClearOpen: false,
      confirmDeleteOpen: false,
      contactBookOpen: false,
      sendBitcoinOpen: false
    }
  }
}
</script>
