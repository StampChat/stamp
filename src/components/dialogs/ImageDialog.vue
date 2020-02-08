<template>
  <q-img
    :src="image"
    native-context-menu
    @mouseenter="showBtn = true"
    @mouseleave="showBtn = false"
  >
    <div
      v-if="showBtn"
      class="absolute-bottom all-pointer-events"
    >
      <q-btn
        size='md'
        class='float-right'
        color='primary'
        label="Close"
        v-close-popup
      />
    </div>
  </q-img>
</template>

<script>
export default {
  props: ['image'],
  data () {
    return {
      showBtn: false
    }
  }
}
</script>
