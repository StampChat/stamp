<template>
  <q-dialog v-model="showBanner">
    <q-card>
      <q-card-section
        ><div class="text-h6">Welcome to Stamp</div></q-card-section
      >
      <q-separator />
      <q-card-section>
        <p>
          The developers of stamp are working hard to secure freedom of speech,
          and digital sovereignty, through decentralized protocols. We're glad
          you're trying out our software.
        </p>
        <p>Please consider becoming a VIP. By subscribing you will:</p>
        <p></p>
        <ul>
          <li>Receive monthly Lotus tokens to use Stamp</li>
          <li>Be added as a default contact in the next release</li>
          <li>Flair next to your name</li>
        </ul>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          dense
          flat
          href="https://www.patreon.com/micropresident"
          color="primary"
          target="_blank"
        >
          Subscribe
        </q-btn>
        <q-btn
          dense
          flat
          href="https://discord.gg/KECbh3JEmm"
          color="primary"
          target="_blank"
        >
          Dev Discord
        </q-btn>
        <q-space />
        <q-btn dense label="Dismiss" v-close-popup color="secondary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia'
import { useAppearanceStore } from 'src/stores/appearance'
import { computed, defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const appearanceStore = useAppearanceStore()
    const { lastDismissed } = storeToRefs(appearanceStore)
    const showBanner = computed({
      get() {
        // Show every ten days
        return lastDismissed.value <= Date.now() - 1000 * 60 * 60 * 24 * 10
      },
      set() {
        lastDismissed.value = Date.now()
      },
    })
    return {
      showBanner,
      dismiss() {
        showBanner.value = false
      },
    }
  },
})
</script>
