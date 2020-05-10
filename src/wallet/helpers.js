export const calcId = function (output) {
  return output.txId.slice(0, 20) + output.outputIndex
}

export const stampPrice = function (outpoints) {
  const amount = outpoints
    .filter((outpoint) => outpoint.type === 'stamp')
    .reduce(
      (totalSatoshis, stampOutpoint) => stampOutpoint.satoshis + totalSatoshis,
      0
    )
  return amount
}
