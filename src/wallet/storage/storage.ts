import { PrivateKey } from 'bitcore-lib-cash'

export interface Outpoint {
  address: string;
  privKey: PrivateKey; // This is okay, we don't add it to the wallet.
  satoshis: number;
  txId: string;
  outputIndex: number;
  type: string;
  frozen: boolean | undefined;
}

export type OutpointId = string

export class OutpointResult implements IteratorYieldResult<Outpoint> {
  done: false;
  value: Outpoint;

  constructor (value: Outpoint) {
    this.done = false
    this.value = value
  }
}

export class OutpointReturnResult implements IteratorReturnResult<Outpoint | undefined> {
  done: true;
  value: Outpoint | undefined;

  constructor (value: Outpoint | undefined = undefined) {
    this.done = true
    this.value = value
  }
}

export interface OutpointStore {
  getOutpoint(id: OutpointId): Promise<Outpoint | undefined>;
  deleteOutpoint(id: OutpointId): Promise<void>;
  putOutpoint(outpoint: Outpoint): Promise<void>;
  freezeOutpoint (outpointId: OutpointId): Promise<void>
  unfreezeOutpoint (outpointId: OutpointId): Promise<void>

  getOutpointIterator(): Promise<AsyncIterator<Outpoint>>;
  getFrozenOutpointIterator(): Promise<AsyncIterator<Outpoint>>;
}
