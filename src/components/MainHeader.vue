<template>
  <q-header elevated>
    <q-splitter
      emit-immediately
      v-model="splitterRatio"
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
          <q-space />
          <q-input
            dark
            dense
            standout
            v-model="searchText"
            input-class="text-right"
            class="q-mx-lg"
            style="width: 100%"
          >
            <template v-slot:append>
              <q-icon
                v-if="searchText === ''"
                name="search"
              />
              <q-icon
                v-else
                name="clear"
                class="cursor-pointer"
                @click="searchText = ''"
              />
            </template>
          </q-input>
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
            icon="search"
          />
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
import { mapActions, mapGetters } from 'vuex'
import { minSplitter, maxSplitter } from '../utils/constants'

export default {
  methods: {
    ...mapActions({
      setSplitterRatio: 'splitter/setSplitterRatio',
      toggleMyDrawerOpen: 'myDrawer/toggleDrawerOpen',
      toggleContactDrawerOpen: 'contactDrawer/toggleDrawerOpen'
    })
  },
  computed: {
    ...mapGetters({
      getContactKeyserver: 'contacts/getContactKeyserver',
      getSplitterRatio: 'splitter/getSplitterRatio',
      getActiveChat: 'chats/getActiveChat'
    }),
    activeProfileName () {
      if (this.getActiveChat !== null) {
        return this.getContactKeyserver(this.getActiveChat).name
      } else {
        return ''
      }
    },
    splitterRatio: {
      get () {
        return this.getSplitterRatio
      },
      set (value) {
        this.setSplitterRatio(value)
      }
    }
  },
  data: function () {
    return {
      searchText: '',
      minSplitter,
      maxSplitter
    }
  }
}
</script>
