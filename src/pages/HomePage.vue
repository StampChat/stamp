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
          News
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
            Welcome to Stamp
          </div>
          <div class="text-body1">
            Stamp is a decentralized, secure, and free for all,
            cryptomessenger. It is currently, highly experimental. Please do
            report bugs to Shammah, from your default contacts.
          </div>
          <q-btn
            v-if="!$status.setup"
            icon="login"
            label="Sign up"
            @click="$router.push('/setup').catch(() => {
            // Don't care. Probably duplicate route
            })"
          />
          <q-btn
            label="See Changelog"
            @click="$router.push('/changelog').catch(() => {
            // Don't care. Probably duplicate route
            })"
          />
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
