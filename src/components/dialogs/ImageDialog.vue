<template>
  <q-card style="min-width: 80%">
    <q-card-section>
      <div class="text-h6">Image</div>
    </q-card-section>
    <q-card-section>
      <q-img :src="image" />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        label="Close"
        color="primary"
        v-close-popup
      />
    </q-card-actions>
  </q-card>
</template>

<script>
export default {
  props: ['image']
}
</script>
