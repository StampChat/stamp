import { Outpoint } from '../types/outpoint'

export function calcId (output: { txId: string, outputIndex: number }) {
  if (!output.txId === undefined || !output.outputIndex === undefined) {
    throw new Error(`Missing values ${JSON.stringify(output)}`)
  }
  return output.txId + '_' + output.outputIndex
}

export function stampPrice (outpoints: Outpoint[]) {
  const amount = outpoints
    .filter((outpoint) => outpoint.type === 'stamp')
    .reduce(
      (totalSatoshis, stampOutpoint) => stampOutpoint.satoshis + totalSatoshis,
      0
    )
  return amount
}
