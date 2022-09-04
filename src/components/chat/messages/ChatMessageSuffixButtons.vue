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
  <div
    v-else-if="status === 'confirmed'"
    @mouseover="mouseoverCheckMobile()"
    @mouseleave="mouseOver = false"
  >
    <q-btn
      dense
      flat
      icon="more_vert"
      class="q-btn"
      padding="xs"
      @click="menuClicked"
      v-show="!showMenu && !mouseOver"
    />
    <template v-for="button in buttonNames" :key="button">
      <q-btn
        :icon="button"
        dense
        flat
        padding="xs"
        class="q-btn"
        @click="buttonClicked"
        v-show="mouseOver || showMenu"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useQuasar } from 'quasar'

const ButtonNames = ['reply', 'forward', 'info', 'delete'] as const
const ButtonEvents = ButtonNames.map(
  buttonName => `${buttonName}Click` as const,
)
type ButtonType = typeof ButtonNames[number]

export default defineComponent({
  name: 'ChatMessageSuffixButtons',
  emits: [...ButtonEvents, 'resendClick'],
  props: {
    status: {
      type: String,
      required: true,
    },
  },
  setup(props, { emit }) {
    const showMenu = ref(false)
    const mouseOver = ref(false)
    const $q = useQuasar()
    return {
      mouseOver,
      showMenu,
      buttonNames: ButtonNames,
      mouseoverCheckMobile() {
        // only set mouseover if not on mobile
        mouseOver.value = !$q.platform.is.mobile
      },
      menuClicked() {
        showMenu.value = !showMenu.value
      },
      buttonClicked(e: Event) {
        const button = e.target as HTMLElement
        if (button?.innerText !== 'close') {
          const buttonType = button?.innerText as ButtonType
          const clickEvent = `${buttonType}Click` as const
          emit(clickEvent)
        }
        // Only flip boolean state if using 3-dot menu button on mobile
        if ($q.platform.is.mobile) {
          showMenu.value = !showMenu.value
        }
      },
    }
  },
})
</script>
