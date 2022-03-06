<template>
  <div v-if="status === 'error'">
    <q-btn
      icon="replay"
      dense
      flat
      padding="xs"
      class="q-btn"
      @click="$emit('resendClick')"
    />
  </div>
  <div v-else-if="status === 'confirmed'">
    <q-btn
      dense
      flat
      icon="more_vert"
      class="q-btn mobile-only"
      padding="xs"
      @click="menuClicked"
      v-show="!showMenu"
    />
    <template v-for="(button, index) in buttons" :key="index">
      <q-btn
        :icon="button"
        dense
        flat
        padding="xs"
        class="q-btn"
        @click="buttonClicked"
        v-show="provided.mouseover || showMenu"
      />
    </template>
  </div>
</template>

<script>
export default {
  name: 'ChatMessageSuffixButtons',
  emits: [
    'replyClick',
    'forwardClick',
    'infoClick',
    'deleteClick',
    'resendClick',
  ],
  data() {
    return {
      showMenu: false,
      buttons: ['reply', 'forward', 'info', 'delete'],
    }
  },
  inject: ['provided'],
  props: {
    status: {
      type: String,
      required: true,
    },
  },
  methods: {
    emit(type) {
      this.$emit(type + 'Click')
    },
    menuClicked() {
      this.showMenu = !this.showMenu
    },
    buttonClicked(e) {
      const button = e.target.innerText
      if (button !== 'close') {
        this.emit(button)
      }
      // Only flip boolean state if using 3-dot menu button on mobile
      if (this.$q.platform.is.mobile) {
        this.showMenu = !this.showMenu
      }
    },
  },
}
</script>
