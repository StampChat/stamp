<template>
  <q-list
    separator
    padding
    style="max-height: 60%;"
  >
    <contact-item
      v-for="(contact, address) in contacts"
      :key="address"
      @mouseover-contact="navigateUsingMouse"
      :address="address"
      :contact="contact"
      :contact-click="contactClick"
      :class="{ active: address === activeAddress}"
    />
  </q-list>
</template>

<script>
import ContactItem from './ContactItem.vue'

export default {
  components: {
    ContactItem
  },
  props: ['contacts', 'contactClick'],
  data () {
    return {
      activeAddress: Object.keys(this.contacts)[0]
    }
  },
  mounted () {
    document.addEventListener('keydown', this.navigateUsingArrowKeys)
  },
  methods: {
    navigateUsingArrowKeys (e) {
      const addresses = Object.keys(this.contacts)
      if (e.key === 'ArrowUp') {
        this.activeAddress = addresses[this.nextAddressIndex({ direction: -1 })]
      }
      if (e.key === 'ArrowDown') {
        this.activeAddress = addresses[this.nextAddressIndex({ direction: 1 })]
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        this.contactClick(this.activeAddress, this.contacts[this.activeAddress])
      }
    },
    nextAddressIndex ({ direction }) {
      const addresses = Object.keys(this.contacts)
      // Add addresses.length so that not found (-1) is the last item
      return (addresses.indexOf(this.activeAddress) + direction + addresses.length) % addresses.length
    },
    navigateUsingMouse (addressToBecomeFocused) {
      this.activeAddress = addressToBecomeFocused
    }
  },
  watch: {
    contacts () {
      this.activeAddress = Object.keys(this.contacts)[0]
    }
  }
}
</script>
