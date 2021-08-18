import { Outpoint, OutpointId } from '../../types/outpoint'

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
  getOutpoint (id: OutpointId): Outpoint | undefined;
  deleteOutpoint (id: OutpointId): void;
  putOutpoint (outpoint: Outpoint): void;
  freezeOutpoint (outpointId: OutpointId): void;
  unfreezeOutpoint (outpointId: OutpointId): void;

  getOutpoints (): Map<string, Outpoint>;

  getOutpointIterator (): Promise<AsyncIterableIterator<Outpoint>>;
  getFrozenOutpointIterator (): Promise<AsyncIterableIterator<Outpoint>>;
}
