<template>
  <div>
    <q-header>
      <q-toolbar class="q-pl-sm">
        <q-btn
          class="q-px-sm"
          flat
          dense
          @click="toggleSettingsDrawerOpen"
          icon="menu"
        />
        <q-toolbar-title class="h6">Changelog</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <q-scroll-area
          ref="chatScroll"
          @scroll="scrollHandler"
          class="q-px-sm absolute full-width full-height"
        >
          <div class="text-h6">v0.0.22 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Add spinner at forum page before posts are loaded (#499)</li>
              <li>Custom window bar for electron build. (#496)</li>
              <li>Forum: add link icon to post titles containing URL (#498)</li>
              <li>Give topic hints to user when posting (#497)</li>
              <li>Enable configuration for a "compact mode" (#495)</li>
              <li>Use percent instead of vw for post size (#494)</li>
              <li>Fix width on small devices (#493)</li>
              <li>Fix margin in reply view (#492)</li>
              <li>Add `top` sort to Forum (#491)</li>
              <li>Fix Threshold filtering on Forum (#490)</li>
              <li>Add some configurability to the Forum feed (#489)</li>
              <li>(sorts) Update POST UX (#487)</li>
              <li>Change header color to white (#488)</li>
              <li>Remove mentions of minimum acceptance price (#486)</li>
              <li>Add error notification to Create Post screen (#485)</li>
              <li>Remove forum icon from title bar in Forum screen (#484)</li>
              <li>Add toast on post, and ensure it loads (#483)</li>
              <li>Fix topic filtering button on Forum (#482)</li>
              <li>
                Protect `/forum/new-post` route for non-signed up users (#481)
              </li>
              <li>Open links in new browser tab (#480)</li>
              <li>Add message markdown preview (#479)</li>
              <li>Fix Reply, Send File, and Give Lotus Actions (#477)</li>
              <li>Fix scrolling behavior in chat on new messages (#476)</li>
              <li>Update butons on Forum title bar (#475)</li>
              <li>Remove CircleCI builds (#474)</li>
              <li>Move header buttons to side panel of Forum (#473)</li>
              <li>Invert ChatLayout to be above the actual Chat page (#472)</li>
              <li>Change formatting of timestamps in forum (#467)</li>
              <li>Update Android manifests for Google Play (#468)</li>
              <li>Fix type warning on `errorNotify`</li>
              <li>
                Upgrade quasar and capacitor to latest version within channel
              </li>
              <li>Fix reply attachment to parent messages (#466)</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.21 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Add a Forum feature so people can post, reply, and vote on
                topics
              </li>
              <li>Fix P2PKH sends to non-Stamp wallets.</li>
              <li>Fix the ability to delete single messages.</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.20 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Fixes signup issue when attempting to create an account.</li>
              <li>
                Convert more code to typescript and fix misc associated issues.
              </li>
              <li>Paralellize message downloading and deletion.</li>
              <li>Fix remote wallet wipe functionality.</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.19 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Check all UTXOs before sending messages as a precautionary
                measure to avoid losing coins.
              </li>
            </ul>
          </div>

          <div class="text-h6">v0.0.18 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Added support for adding a contact via links to
                https://web.stampchat.io/#/chat/&lt;address&gt; This can be used
                to on-board new users directly though a link.
              </li>
              <li>Fix Stamp Android packaging to properly say "Stamp"</li>
              <li>
                Fix an issue with change generation under certain cases omitting
                a change output and creating a very high fee transaction.
              </li>
            </ul>
          </div>

          <div class="text-h6">v0.0.17 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Make references to sending Lotus to be more thematic</li>
              <li>Redenominate the UI to Lotus everywhere with 2 decimals</li>
              <li>Updating your avatar now works correctly</li>
              <li>
                Reply components now show contents of the messages they replied
                to (Except for in group chat)
              </li>
              <li>
                Clip long words in userlist captions to prevent widget overflows
              </li>
              <li>More fixes to restoring state on schema version change</li>
              <li>Fix display of addresses in the Transactions Dialog</li>
              <li>Fix seed phrase entry to allow spaces</li>
              <li>One (final?) fix to the scrolling behavior</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.16 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Fix bug with stamp amounts not being settable after upgrading to
                Quasar 2
              </li>
              <li>Fix more issues with scrolling on Quasar 2</li>
              <li>Clean up Ok/Cancel button placements</li>
              <li>Fix storage migrations when schema changes</li>
              <li>
                Move setup dialog to after main layout loads so homepage can be
                seen
              </li>
              <li>Add confirmation route for remote wiping wallet</li>
              <li>
                Added a link to the lotus lounge faucet from the deposit screen
              </li>
              <li>
                Clicking anywhere on the contact "notivations" button now
                toggles it
              </li>
              <li>Remove several non-functioning widgets in the UI</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.15 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Fix scrolling behavior on Quasar 2</li>
              <li>Fix attaching images to messages</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.14 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Upgrade to quasar v2, vuejs v3, and vuex v4</li>
              <li>Convert wallet and messaging libraries to typescript</li>
              <li>Rewrite vuex local storage module</li>
              <li>
                Fix a significant number of bugs which were revealed during
                typescript conversion
              </li>
            </ul>
          </div>

          <div class="text-h6">v0.0.13 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Fix issue where received stamps and stealth amounts were adding
                invalid utxos to wallet due to using the transactionss TxHash
                instead of TxId
              </li>
              <li>
                Fix sending Lotus to legacy wallets via P2PKH transactions
              </li>
            </ul>
          </div>

          <div class="text-h6">v0.0.12 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Use XAddresses</li>
              <li>Use `Lotus` and `XPI` units</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.11 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Change licensing to be GPL for UI, and MIT for libraries</li>
              <li>Fix balance button on UI</li>
              <li>
                Various improcements to transaction construction and change
                creation
              </li>
              <li>Update quasar and other dependencies</li>
            </ul>
          </div>

          <div class="text-h6">v0.0.10 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Ensure UTXOs are unable to be used twice during transaction
                construction
              </li>
              <li>
                Select UTXOs and fee rates to avoid creating change almost
                always
              </li>
            </ul>
          </div>

          <div class="text-h6">v0.0.9 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>
                Fix various issues with transaction construction which were
                causing coin burns
              </li>
            </ul>
          </div>

          <div class="text-h6">v0.0.8 Changelog</div>
          <div class="text-body1">
            <ul>
              <li>Use Stamp icon on EULA screen</li>
              <li>Add stamp icon to assets and use it for default news icon</li>
              <li>Fix copy on news page to say Stamp</li>
              <li>Add HostFat to default contacts</li>
              <li>Update EULA copy</li>
              <li>Remove add/remove UTXO log lines which slow down client</li>
              <li>
                Remove the need to recalculate wallet balance from all UTXOs
              </li>
              <li>Increase chunk size when reloading messages</li>
              <li>
                Implement a quick-and-dirty way to reset your remote wallet
              </li>
              <li>Fix bugs in forwardUTXOsToAddress when deleting messages</li>
              <li>Add recording of p2pkh transactions in remote outbox</li>
              <li>
                Refresh contacts on start, including fetching profile image
              </li>
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
  </div>
</template>

<script>
const scrollDuration = 0

export default {
  props: {},
  components: {},
  data() {
    return {
      bottom: null,
    }
  },
  emits: ['toggleMyDrawerOpen'],
  methods: {
    scrollBottom() {
      const scrollArea = this.$refs.chatScroll
      if (!scrollArea) {
        // Not mounted yet
        return
      }
      this.$nextTick(() =>
        scrollArea.setScrollPercentage('vertical', 1.0, scrollDuration),
      )
    },
    scrollHandler(details) {
      if (
        // Ten pixels from bottom
        details.verticalSize -
          details.verticalPosition -
          details.verticalContainerSize <=
        10
      ) {
        this.bottom = true
      } else {
        this.bottom = false
      }
    },
    toggleSettingsDrawerOpen() {
      this.$emit('toggleMyDrawerOpen')
    },
  },
  computed: {},
  watch: {},
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
