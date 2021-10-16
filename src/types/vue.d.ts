import { ElectrumClient } from 'electrum-cash'
import RelayClient from 'src/cashweb/relay'
import { Wallet } from 'src/cashweb/wallet'
import { RootState } from 'src/store/modules'
import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    // Vuejs props
    // Stamp properties
    $electrum: {
      connected: boolean
    };
    $electrumClientPromise: Promise<ElectrumClient>;

    $wallet: Wallet,
    $relayClient: RelayClient,
    $store: Store<RootState>
  }
}
