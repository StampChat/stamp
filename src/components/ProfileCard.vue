<template>
  <q-img
    class="absolute-top"
    src="https://cdn.quasar.dev/img/material.png"
    style="height: 130px"
  >
    <q-list class="absolute-bottom bg-transparent q-pa-none">
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
            class="text-white"
            caption
            lines="1"
          >{{ acceptancePrice }}
          </q-item-label>
        </q-item-section>
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
          >{{ address }}</q-item-label>

        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            dense
            color="white"
            icon="file_copy"
            size="sm"
            @click="copyAddress()"
          />
        </q-item-section>
      </q-item>
    </q-list>

  </q-img>
</template>

<script>
import { copyToClipboard } from 'quasar'

export default {
  props: ['avatar', 'name', 'bio', 'address', 'acceptancePrice'],
  methods: {
    copyAddress () {
      copyToClipboard(this.address).then(() => {
        this.$q.notify({
          message: '<div class="text-center"> Address copied to clipboard </div>',
          html: true,
          color: 'purple'
        })
      })
        .catch(() => {
          // fail
        })
    }
  }
}
</script>
