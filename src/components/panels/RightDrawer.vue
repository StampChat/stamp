<template>
  <div class="column full-height">
    <!-- Send Lotus dialog -->
    <q-dialog v-model="sendBitcoinOpen">
      <send-bitcoin-dialog
        :address="address"
        :contact="contact.profile"
      />
    </q-dialog>

    <!-- TODO: Renable these features at a later data. They don't work correctly, but were only for demo purposes. -->

    <!-- Clear history dialog -->
    <!-- <q-dialog v-model="confirmClearOpen">
      <clear-history-dialog
        :address="address"
        :name="contact.profile.name"
      />
    </q-dialog> -->

    <!-- Delete chat dialog -->
    <!-- <q-dialog v-model="confirmDeleteOpen">
      <delete-chat-dialog
        :address="address"
        :name="contact.profile.name"
      />
    </q-dialog>
 -->
    <!-- Contact book dialog -->
    <q-dialog v-model="contactBookOpen">
      <contact-book-dialog :contact-click="function (shareAddr, contact) { return shareContact({ currentAddr: address, shareAddr }) }" />
    </q-dialog>

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
            Send Lotus
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          v-ripple
          @click="() => notifications = !notifications"
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

        <!-- This does not work anymore due to the way it operates w/ setting message text which was previously refactored. -->
        <!-- <q-item
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
        </q-item> -->

        <!-- <q-separator />
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
        </q-item> -->

        <!-- TODO: Enable per-chat deletion. This currently does not work remotely, so it is being disabled. -->
        <!-- <q-item
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
        </q-item> -->
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from 'vuex'
import ContactCard from './ContactCard.vue'
// import ClearHistoryDialog from '../dialogs/ClearHistoryDialog.vue'
// import DeleteChatDialog from '../dialogs/DeleteChatDialog.vue'
import ContactBookDialog from '../dialogs/ContactBookDialog.vue'
import SendBitcoinDialog from '../dialogs/SendBitcoinDialog.vue'

export default {
  components: {
    ContactCard,
    // ClearHistoryDialog,
    // DeleteChatDialog,
    ContactBookDialog,
    SendBitcoinDialog
  },
  props: {
    address: {
      type: String,
      default: () => ''
    },
    contact: {
      type: Object,
      default: () => ({
        profile: { name: 'Unknown', avatar: '' }
      })
    }
  },
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
