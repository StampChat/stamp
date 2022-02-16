<template>
  <q-btn
    dense
    flat
    icon="more_vert"
    class="q-btn mobile-only"
    padding="xs"
    @click="menuClicked"
    v-show="!showMenu"
  />
  <div
    v-if="status === 'error'"
  >
    <q-btn
      icon="replay"
      dense
      flat
      padding="xs"
      class="q-btn"
      @click="$emit('resendClick')"
    />
  </div>
  <div
    v-else
  >
    <template
      v-for="(button, index) in buttons"
      :key="index"
    >
      <q-btn
        :icon="button"
        dense
        flat
        padding="xs"
        class="q-btn"
        @click="buttonClicked"
        v-show="hovered || showMenu"
      />
    </template>
  </div>
</template>

<script>

export default {
  name: 'ChatMessageSuffixButtons',
  emits: ['replyClick', 'forwardClick', 'infoClick', 'deleteClick', 'resendClick'],
  data () {
    return {
      showMenu: false,
      buttons: [
        'reply', 'forward', 'info', 'delete'
      ]
    }
  },
  props: {
    status: {
      type: String,
      required: true
    },
    hovered: {
      type: Boolean,
      default: () => false
    }
  },
  methods: {
    emit (type) {
      this.$emit(type + 'Click')
    },
    menuClicked () {
      this.showMenu = !this.showMenu
    },
    buttonClicked (e) {
      const button = e.target.innerText
      if (button !== 'close') {
        this.emit(button)
      }
      // Only flip boolean state if using 3-dot menu button on mobile
      if (this.$q.platform.is.mobile) {
        this.showMenu = !this.showMenu
      }
    }
  }
  /*
  computed: {
    buttonOrder () {
      const buttons = this.buttons
      // add the menu close button to front or back of buttons array
      this.outbound ? buttons.unshift('close') : buttons.push('close')
      return buttons
    }
  }
  */
}
</script>
