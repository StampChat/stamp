<template>
  <q-img
    class="absolute-top"
    src="https://cdn.quasar.dev/img/material.png"
    style="height: 150px"
  >
    <q-list class="absolute-bottom bg-transparent q-pa-none">
      <q-item class="bg-transparent q-pa-none">
        <q-avatar
          avatar
          size="56px"
        >
          <img src="https://cdn.quasar.dev/img/boy-avatar.png">
        </q-avatar>
      </q-item>

      <q-item class="bg-transparent q-pa-none">
        <q-item-section>
          <q-item-label
            class="text-weight-bold text-white"
            lines="1"
          >{{ name }}</q-item-label>
          <q-item-label
            class="text-white"
            caption
            lines="1"
          >{{ address }} </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            dense
            color="white"
            icon="file_copy"
          />
        </q-item-section>
      </q-item>
    </q-list>

  </q-img>
</template>

<script>
export default {
  props: ['address', 'name']
}
</script>
