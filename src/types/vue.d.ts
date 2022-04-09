import RelayClient from 'src/cashweb/relay'
import { Wallet } from 'src/cashweb/wallet'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $wallet: Wallet
    $relayClient: RelayClient
    $relay: {
      connected: boolean
    }
    $indexer: {
      connected: boolean
    }
    $status: {
      loaded: boolean
      setup: boolean
    }

    openURL: (url: string) => void
  }
}
