<template>
  <q-badge class="reaction" outline @click.prevent>
    <!-- Who Reacted -->
    <q-menu no-focus auto-close transition-duration="50">
      <q-list dense>
        <q-item v-for="(reactor, index) in reactors" :key="index">
          <q-item-section avatar>
            <q-img
              :src="reactor.avatar"
              width="24px"
              height="24px"
              fit="contain"
            />
          </q-item-section>
          <q-item-section side no-wrap>
            {{ reactor.name }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
    <!-- Reaction -->
    <span v-if="reactors.length > 1" class="reaction-count text-bold">
      {{ reactors.length }}
    </span>
    <span class="reaction-size">
      {{ reaction }}
    </span>
  </q-badge>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'ChatMessageReactions',
  props: {
    reaction: {
      type: String,
      required: true,
    },
    addresses: {
      type: Array,
      required: true,
    },
  },
  methods: {
    ...mapGetters({
      getContact: 'contacts/getContact',
      getProfile: 'myProfile/getProfile',
    }),
    getProfileAvatar(address: string) {
      if (address == this.$wallet.myAddress?.toXAddress()) {
        return this.getProfile().avatar
      } else {
        return this.getContact()(address).profile.avatar
      }
    },
    getProfileName(address: string) {
      if (address == this.$wallet.myAddress?.toXAddress()) {
        return 'You'
      } else {
        return this.getContact()(address).profile.name
      }
    },
  },
  computed: {
    reactors() {
      return this.addresses.map(address => {
        return {
          name: this.getProfileName(address as string),
          avatar: this.getProfileAvatar(address as string),
        }
      })
    },
  },
})
</script>

<style lang="scss" scoped>
.reaction {
  background-color: $primary;
  border-radius: 8px;
  cursor: default;
  margin-left: 1px;
  margin-right: 1px;
}
.reaction-count {
  margin-right: 3px;
}
.reaction-size {
  font-size: 14px;
}
</style>
