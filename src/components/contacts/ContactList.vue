<template>
  <q-list
    separator
    style="max-height: 60%;"
  >
    <contact-item
      v-for="(contact, address) in contacts"
      v-bind:key="address"
      :address="address"
      :contact="contact"
    />
  </q-list>
</template>

<script>
import ContactItem from './ContactItem.vue'

export default {
  components: {
    ContactItem
  },
  props: ['contacts'],
  data () {
    return {}
  }
}
</script>
