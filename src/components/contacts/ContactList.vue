<template>
  <q-list
    separator
    padding
    style="max-height: 60%;"
  >
    <contact-item
      v-for="(contact, address) in contactsState"
      v-bind:key="address"
      v-on:mouseover-contact="navigateUsingMouse"
      :key="address"
      :address="address"
      :contact="contact"
      :contactClick="contactClick"
      :class="{ active: contact.inFocus}"
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
      contactsState: this.setInitialContactsState()
    }
  },
  mounted () {
    document.addEventListener('keydown', this.navigateUsingArrowKeys)
  },
  methods: {
    setInitialContactsState () {
      let contactsState = Object.keys(this.contacts).reduce((acc, address) => {
        let value = this.contacts[address]
        value.inFocus = false
        acc[address] = value
        return acc
      }, {})
      contactsState[Object.keys(this.contacts)[0]].inFocus = true
      return contactsState
    },
    navigateUsingArrowKeys (e) {
      if (e.key === 'ArrowUp') {
        const addresses = Object.keys(this.contactsState)

        const currentAddressInFocus = addresses.find(address => this.contactsState[address].inFocus)
        const indexOfCurrentContactInFocus = addresses.indexOf(currentAddressInFocus)

        const indexOfNextContactInFocus = (indexOfCurrentContactInFocus - 1 + addresses.length) % addresses.length
        const nextAddressInFocus = addresses[indexOfNextContactInFocus]

        this.contactsState[currentAddressInFocus].inFocus = false
        this.contactsState[nextAddressInFocus].inFocus = true
      } else if (e.key === 'ArrowDown') {
        const addresses = Object.keys(this.contactsState)

        const currentAddressInFocus = addresses.find(address => this.contactsState[address].inFocus)
        const indexOfCurrentContactInFocus = addresses.indexOf(currentAddressInFocus)

        const indexOfNextContactInFocus = (indexOfCurrentContactInFocus + 1) % addresses.length
        const nextAddressInFocus = addresses[indexOfNextContactInFocus]

        this.contactsState[currentAddressInFocus].inFocus = false
        this.contactsState[nextAddressInFocus].inFocus = true
      }
    },
    navigateUsingMouse (addressToBecomeFocused) {
      const addresses = Object.keys(this.contactsState)
      addresses.forEach(address => {
        if (address === addressToBecomeFocused) {
          this.contactsState[address].inFocus = true
        } else {
         this.contactsState[address].inFocus = false
        }
      })
    }
  }
}
</script>
