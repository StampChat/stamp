<template>
  <q-header elevated>
    <q-splitter
      v-bind:value="splitRatio"
      v-on:input="onSplitting"
      separator-style="width: 0px"
      :limits="[minSplitter, maxSplitter]"
    >
      <template v-slot:before>
        <q-toolbar>
          <q-btn
            flat
            dense
            round
            @click="toggleMyDrawerOpen"
            icon="menu"
            aria-label="Menu"
          />
        </q-toolbar>
      </template>

      <template v-slot:after>
        <q-toolbar>
          <q-toolbar-title class="h6">
            {{activeProfileName}}
          </q-toolbar-title>
          <q-space />
          <q-btn
            class="q-px-sm"
            flat
            dense
            color="white"
            @click="toggleContactDrawerOpen"
            icon="face"
          />
        </q-toolbar>
      </template>
    </q-splitter>

  </q-header>
</template>

<script>
import { mapGetters } from 'vuex'
import { minSplitter, maxSplitter } from '../utils/constants'

export default {
  data: function () {
    return {
      searchText: '',
      minSplitter,
      maxSplitter
    }
  },
  props: {
    splitRatio: {
      type: Number,
      default: 20
    }
  },
  methods: {
    onSplitting (value) {
      this.$emit('splitting', value)
    },
    toggleMyDrawerOpen () {
      this.$emit('toggleMyDrawerOpen')
    },
    toggleContactDrawerOpen () {
      this.$emit('toggleContactDrawerOpen')
    }
  },
  computed: {
    ...mapGetters({
      getContactProfile: 'contacts/getContactProfile',
      getActiveChat: 'chats/getActiveChat'
    }),
    activeProfileName () {
      if (this.getActiveChat !== null) {
        return this.getContactProfile(this.getActiveChat).name
      } else {
        return ''
      }
    }
  }
}
</script>
