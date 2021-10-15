import { PrivateKey } from 'bitcore-lib-xpi'

export interface Outpoint {
  id: string;
  address: string;
  privKey: PrivateKey; // This is okay, we don't add it to the wallet.
  satoshis: number;
  txId: string;
  outputIndex: number;
  type: string;
  frozen?: boolean;
}

export type OutpointId = string
