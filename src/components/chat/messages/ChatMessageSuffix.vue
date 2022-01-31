<template>
  <div
    v-if="status === 'error'"
  >
    <q-icon
      name="error"
      color="red"
    />
  </div>
  <div
    v-else
  >
    <div>
      <div class="col">
        {{ stamp }}
      </div>
      <div class="col">
        {{ amount }}
      </div>
    </div>
  </div>
</template>

<script>
// import { defineComponent } from '@vue/composition-api'

export default {
  name: 'ChatMessageSuffix',
  props: {
    stamp: {
      type: String,
      required: true
    },
    amount: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    }
  }
}
</script>
