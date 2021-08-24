<template>
  <q-layout
    view="lhh LpR lff"
    container
    class="hide-scrollbar absolute full-width"
  >
    <q-header>
      <q-toolbar class="q-pl-sm">
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="toggleSettingsDrawerOpen"
          icon="menu"
        />
        <q-toolbar-title class="h6">
          Changelog
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <q-scroll-area
          ref="chatScroll"
          @scroll="scrollHandler"
          class="q-px-sm absolute full-width full-height"
        >
          <div class="text-h6">
            v0.0.15 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Fix scrolling behavior on Quasar 2</li>
              <li>Fix attaching images to messages</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.14 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Upgrade to quasar v2, vuejs v3, and vuex v4</li>
              <li>Convert wallet and messaging libraries to typescript</li>
              <li>Rewrite vuex local storage module</li>
              <li>Fix a significant number of bugs which were revealed during typescript conversion</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.13 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Fix issue where received stamps and stealth amounts were adding invalid utxos to wallet due to using the transactionss TxHash instead of TxId</li>
              <li>Fix sending Lotus to legacy wallets via P2PKH transactions</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.12 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Use XAddresses</li>
              <li>Use `Lotus` and `XPI` units</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.11 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Change licensing to be GPL for UI, and MIT for libraries</li>
              <li>Fix balance button on UI</li>
              <li>Various improcements to transaction construction and change creation</li>
              <li>Update quasar and other dependencies</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.10 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Ensure UTXOs are unable to be used twice during transaction construction</li>
              <li>Select UTXOs and fee rates to avoid creating change almost always</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.9 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Fix various issues with transaction construction which were causing coin burns</li>
            </ul>
          </div>

          <div class="text-h6">
            v0.0.8 Changelog
          </div>
          <div class="text-body1">
            <ul>
              <li>Use Stamp icon on EULA screen</li>
              <li>Add stamp icon to assets and use it for default news icon</li>
              <li>Fix copy on news page to say Stamp</li>
              <li>Add HostFat to default contacts</li>
              <li>Update EULA copy</li>
              <li>Remove add/remove UTXO log lines which slow down client</li>
              <li>Remove the need to recalculate wallet balance from all UTXOs</li>
              <li>Increase chunk size when reloading messages</li>
              <li>Implement a quick-and-dirty way to reset your remote wallet</li>
              <li>Fix bugs in forwardUTXOsToAddress when deleting messages</li>
              <li>Add recording of p2pkh transactions in remote outbox</li>
              <li>Refresh contacts on start, including fetching profile image</li>
            </ul>
          </div>
        </q-scroll-area>
        <q-page-sticky
          position="bottom-right"
          :offset="[18, 18]"
          v-show="!bottom"
        >
          <q-btn
            round
            size="md"
            icon="keyboard_arrow_down"
            color="accent"
            @click="scrollBottom"
          />
        </q-page-sticky>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
const scrollDuration = 0

export default {
  props: {},
  components: {},
  data () {
    return {
      bottom: null
    }
  },
  emits: ['toggleMyDrawerOpen'],
  methods: {
    scrollBottom () {
      const scrollArea = this.$refs.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      this.$nextTick(() =>
        scrollArea.setScrollPercentage(
          'vertical',
          1.0,
          scrollDuration
        )
      )
    },
    scrollHandler (details) {
      if (
        // Ten pixels from bottom
        details.verticalSize - details.verticalPosition - details.verticalContainerSize <= 10
      ) {
        this.bottom = true
      } else {
        this.bottom = false
      }
    },
    toggleSettingsDrawerOpen () {
      this.$emit('toggleMyDrawerOpen')
    }
  },
  computed: {
  },
  watch: {
  }
}
</script>

<style lang="scss" scoped>
.reply {
  padding: 5px 0;
  color: var(--q-color-text);
  background: var(--q-color-background);
  padding-left: 8px;
  border-left: 3px;
  border-left-style: solid;
  border-left-color: $primary;
}

.scroll-area-bordered {
  border-right: 1px;
  border-right-style: solid;
  border-right-color: $separator-color;
  border-bottom: 1px;
  border-bottom-style: solid;
  border-bottom-color: $separator-color;
}
</style>