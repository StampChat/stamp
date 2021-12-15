import { Utxo } from '../types/utxo'

export function calcUtxoId(outpoint: { txId: string; outputIndex: number }) {
  if (!outpoint.txId === undefined || !outpoint.outputIndex === undefined) {
    throw new Error(`Missing values ${JSON.stringify(outpoint)}`)
  }
  return outpoint.txId + '_' + outpoint.outputIndex
}

export function stampPrice(utxos: Utxo[]) {
  const amount = utxos
    .filter(Utxo => Utxo.type === 'stamp')
    .reduce((totalSatoshis, stampUtxo) => stampUtxo.satoshis + totalSatoshis, 0)
  return amount
}
