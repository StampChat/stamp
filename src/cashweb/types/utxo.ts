import { PrivateKey } from 'bitcore-lib-xpi'

export interface Utxo {
  address: string
  privKey: PrivateKey // This is okay, we don't add it to the wallet.
  satoshis: number
  txId: string
  outputIndex: number
  type: string
  frozen?: boolean
}

export type UtxoId = string
