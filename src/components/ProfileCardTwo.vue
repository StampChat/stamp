<template>
  <q-card>
    <q-item class="bg-transparent q-pa-none">
      <q-item-section>
        <q-avatar rounded>
          <img :src="avatar">
        </q-avatar>
      </q-item-section>
      <q-item-section>
        <q-item-label
          style="text-align: right;"
          class="text-weight-bold text-white"
          lines="1"
        >Inbox Fee</q-item-label>
        <q-item-label
          style="text-align: right;"
          caption
          lines="1"
        >{{ acceptancePrice }}
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-item class="bg-transparent q-pa-none">
      <q-item-section>
        <q-item-label
          class="text-weight-bold"
          lines="1"
        >{{ name }}</q-item-label>
        <q-item-label
          caption
          lines="1"
        >{{ address }}</q-item-label>

      </q-item-section>
      <q-item-section side>
        <q-btn
          flat
          dense
          icon="file_copy"
          size="sm"
        />
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script>
export default {
  props: ['avatar', 'name', 'bio', 'address', 'acceptancePrice']
}
</script>
