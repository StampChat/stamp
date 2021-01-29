<template>
  <div class="col q-gutter-y-md">
    <div class="row p-mx-sm">
      <q-space />
      <q-img
        src="~assets/stamp-icon.png"
        width="25vw"
        spinner-color="white"
      />
      <q-space />
    </div>

    <div class="row p-mx-sm text-h6">
      <q-space />
      Welcome to StampChat
      <q-space />
    </div>

    <div class="row q-gutter-y-md">
      This software is very prototype cryptomessenger, and may lose funds. Keep larger amounts of eCash in more established wallets.
    </div>

    <div class="row q-gutter-y-md">
      By clicking "Agree", you understand that this software is provided "As is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement.
    </div>
  </div>
</template>

<script>
export default {
  model: {
    event: 'input'
  },
  props: {
  },
  data () {
    return {}
  },
  methods: {},
  computed: {}
}
</script>
