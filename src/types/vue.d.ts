import RelayClient from 'src/cashweb/relay'
import { Wallet } from 'src/cashweb/wallet'
import { RootState } from 'src/store/modules'
import { Store } from 'vuex'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    // Vuejs props
    // Stamp properties
    $indexer: {
      connected: boolean
    }

    $wallet: Wallet
    $relayClient: RelayClient
    $store: Store<RootState>
  }
}
