import { ElectrumClient } from 'electrum-cash'
import RelayClient from 'src/cashweb/relay'
import { Wallet } from 'src/cashweb/wallet'
import Vue from 'vue'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $electrum: {
      connected: boolean
    };
    $electrumClientPromise: Promise<ElectrumClient>;
    $refs: {
      stepper: {
        previous: () => void,
        next(): () => void
      }
    };
    $wallet: Wallet,
    $relayClient: RelayClient
  }
}
