<template>
  <q-list
    separator
    padding
    style="max-height: 60%;"
  >
    <contact-item
      v-for="(contact, address) in contacts"
      v-bind:key="address"
      v-on:mouseover-contact="navigateUsingMouse"
      :address="address"
      :contact="contact"
      :contactClick="contactClick"
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
        this.contactClick(this.activeAddress, this.contacts[this.activeAddress])
        this.$emit('close-contact-search-dialog')
      }
    },
    nextAddressIndex ({ direction }) {
      const addresses = Object.keys(this.contacts)
      return (addresses.indexOf(this.activeAddress) + direction + addresses.length) % addresses.length
    },
    navigateUsingMouse (addressToBecomeFocused) {
      this.activeAddress = addressToBecomeFocused
    }
  }
}
</script>
