<template>
  <q-card
    class="bg-secondary q-pa-sm full-width"
    style="height: 130px"
    flat
    square
  >
    <q-list class="bg-transparent q-pa-none">
      <q-item>
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
          >
            Minimum Stamp
          </q-item-label>
          <q-item-label
            style="text-align: right;"
            class="text-white"
            caption
            lines="1"
          >
            {{ acceptancePrice }}
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label
            class="text-weight-bold text-white"
            lines="1"
          >
            {{ name }}
          </q-item-label>
          <q-item-label
            class="text-white"
            caption
            lines="1"
          >
            {{ displayAddress }}
          </q-item-label>
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
  </q-card>
</template>

<script>
import { copyToClipboard } from 'quasar'
import { addressCopiedNotify } from '../../utils/notifications'
import { Address, Networks } from 'bitcore-lib-xpi'
import { displayNetwork } from 'src/utils/constants'

export default {
  props: {
    name: {
      type: String,
      default: () => ''
    },
    address: {
      type: String,
      default: () => ''
    },
    bio: {
      type: String,
      default: () => ''
    },
    acceptancePrice: {
      type: Number,
      default: () => 5000
    },
    avatar: {
      type: String,
      default: () => ''
    }
  },
  methods: {
    copyAddress () {
      copyToClipboard(this.displayAddress)
        .then(() => {
          addressCopiedNotify()
        })
        .catch(() => {
          // fail
        })
    }
  },
  computed: {
    displayAddress () {
      const address = Address(this.address)
      const displayAddress = Address(address.hashBuffer, Networks.get(displayNetwork)).toCashAddress()
      return displayAddress
    }
  }
}
</script>
