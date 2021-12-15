import { Utxo, UtxoId } from '../../types/utxo'

export class UtxoResult implements IteratorYieldResult<Utxo> {
  done: false
  value: Utxo

  constructor(value: Utxo) {
    this.done = false
    this.value = value
  }
}

export class UtxoReturnResult
  implements IteratorReturnResult<Utxo | undefined>
{
  done: true
  value: Utxo | undefined

  constructor(value: Utxo | undefined = undefined) {
    this.done = true
    this.value = value
  }
}

export interface UtxoStore {
  getById(id: UtxoId): Utxo | undefined
  deleteById(id: UtxoId): void
  put(outpoint: Utxo): void
  freezeById(outpointId: UtxoId): void
  unfreezeById(outpointId: UtxoId): void

  getUtxoMap(): Map<string, Utxo>

  utxosIter(): Promise<AsyncIterableIterator<Utxo>>
  frozenUtxosIter(): Promise<AsyncIterableIterator<Utxo>>
  clear(): Promise<void>
}
