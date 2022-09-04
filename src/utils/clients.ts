import assert from 'assert'
import RelayClient from 'src/cashweb/relay'
import { Wallet } from 'src/cashweb/wallet'

let wallet: Wallet | null = null
export function useWallet(newWallet?: Wallet) {
  if (newWallet) {
    wallet = newWallet
  }
  assert(wallet, 'Attempting to use wallet before setup')
  return wallet
}

let relayClient: RelayClient | null = null
export function useRelayClient(newRelayClient?: RelayClient) {
  if (newRelayClient) {
    relayClient = newRelayClient
  }
  assert(relayClient, 'Attempting to use relayClient before setup')
  return relayClient
}
