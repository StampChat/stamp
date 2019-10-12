<template>
  <q-layout view="hHr LpR lff">
    <my-drawer />
    <contact-drawer />
    <main-header />
    <q-page-container>
      <q-splitter
        v-model="splitterRatio"
        separator-style="width: 0px"
      >
        <template v-slot:before>
          <chat-list />
        </template>

        <template v-slot:after>
          <chat />
        </template>

      </q-splitter>
    </q-page-container>

  </q-layout>

</template>

<script>
import Chat from '../pages/Chat.vue'
import ChatList from '../components/ChatList.vue'
import MyDrawer from '../components/MyDrawer.vue'
import ContactDrawer from '../components/ContactDrawer.vue'
import MainHeader from '../components/MainHeader.vue'
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'MainLayout',
  components: {
    Chat,
    ChatList,
    ContactDrawer,
    MyDrawer,
    MainHeader
  },
  methods: {
    ...mapActions(['setSplitterRatio'])
  },
  computed: {
    ...mapGetters([
      'getSplitterRatio'
    ]),
    splitterRatio: {
      get () {
        return this.getSplitterRatio
      },
      set (value) {
        this.setSplitterRatio(value)
      }
    }
  }
}
</script>
