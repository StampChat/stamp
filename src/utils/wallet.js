export const calcId = function (output) {
  return output.txId.slice(0, 20) + output.outputIndex
}
