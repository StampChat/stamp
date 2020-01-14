<template>
  <q-card
    style="width: 500px"
    class="q-px-sm q-pb-md"
  >
    <q-card-section>
      <div class="text-h6">New Contact</div>
    </q-card-section>
    <q-card-section>
      <q-input
        class="text-bold text-h6"
        v-model="address"
        filled
        dense
        placeholder="Enter address..."
        debounce="250"
      />
    </q-card-section>
    <q-slide-transition>
      <q-card-section v-show="(profile === null) && address !== ''">
        <q-item>
          <q-item-section avatar>
            <q-icon
              color="negative"
              name="error"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Not found</q-item-label>
          </q-item-section>
        </q-item>
      </q-card-section>
    </q-slide-transition>
    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        color="primary"
        v-close-popup
      />
      <q-btn
        flat
        :disable="profile === null"
        label="Add"
        color="primary"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  data () {
    return {
      address: '',
      profile: null
    }
  },
  watch: {
    address: async function (newAddress, oldAddress) {
      if (newAddress === '') {
        this.profile = null
        return
      }
      let ksHandler = this.getKsHandler()
      this.profile = await ksHandler.getProfile(newAddress)
    }
  },
  methods: {
    ...mapActions({
      addNewContact: 'contacts/addNewContact'
    }),
    ...mapGetters({
      getKsHandler: 'keyserverHandler/getHandler'
    })
  }
}
</script>
