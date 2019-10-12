<template>
  <q-header elevated>
    <q-splitter
      v-model="splitterRatio"
      separator-style="width: 0px"
    >
      <template v-slot:before>
        <q-toolbar>
          <q-btn
            flat
            dense
            round
            @click="toggleDrawerOpen"
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
            {{activeProfile.name}}
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
            icon="face"
          />
          <q-btn
            class="q-px-sm"
            flat
            dense
            color="white"
            icon="arrow_drop_down"
          />
        </q-toolbar>
      </template>
    </q-splitter>

  </q-header>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  methods: {
    ...mapActions(['setSplitterRatio']),
    ...mapGetters({
      getProfile: 'contacts/getProfile',
      getActiveChat: 'chats/getActiveChat'
    }),
    ...mapActions({
      toggleDrawerOpen: 'drawer/toggleDrawerOpen'
    })
  },
  computed: {
    ...mapGetters(['getSplitterRatio']),
    activeProfile () {
      return this.getProfile()(this.getActiveChat())
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
      searchText: ''
    }
  }
}
</script>
