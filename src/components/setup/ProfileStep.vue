<template>
  <div class="col q-gutter-y-md">
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold">
          What is a Profile?
        </div>
      </q-card-section>
      <q-card-section class="text-body2">
        Your profile is the public information attached to your <strong>identity address</strong>. When people search for your identity address this information will be presented to them. <br><br>

        The inbox settings are also public, they tell your peers the minimum stamp required to send to you!
      </q-card-section>
    </q-card>
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold">
          Identity Address
        </div>
      </q-card-section>
      <q-card-section>
        <q-input
          class="fit"
          filled
          auto-grow
          v-model="getMyAddressStr"
          readonly
        />
      </q-card-section>
    </q-card>
    <q-card>
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle1 text-bold">
          Create a Profile
        </div>
      </q-card-section>
      <q-card-section>
        <profile v-model="innerData" />
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import Profile from '../Profile'

export default {
  components: {
    Profile
  },
  model: {
    prop: 'relayData',
    event: 'input'
  },
  props: {
    relayData: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    innerData: {
      get () {
        return this.relayData
      },
      set (val) {
        this.$emit('input', val)
      }
    },
    getMyAddressStr () {
      return this.$wallet.myAddressStr
    }
  }
}
</script>
