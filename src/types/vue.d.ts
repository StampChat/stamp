import { RelayClient, Wallet } from 'cashweb'
import { ElectrumClient } from 'electrum-cash'
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
