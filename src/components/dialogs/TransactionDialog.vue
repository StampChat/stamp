<template>
  <q-card style="min-width: 50%">
    <q-card-section>
      <div class="text-h6">{{title}}</div>
    </q-card-section>
    <q-card-section>
      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>{{transaction.hash}}</q-item-label>
            <q-item-label caption>Transaction ID</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
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
  props: ['title', 'transaction']
}
</script>
