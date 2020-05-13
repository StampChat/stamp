const cashlib = require('bitcore-lib-cash')

export const formatBalance = function (satoshis, format) {
  if (format.type === 'sats') {
    if (satoshis < 1_000) {
      return String(satoshis) + ' sats'
    } else if (satoshis < 100_000) {
      return String(satoshis / 100) + ' uBCH'
    } else if (satoshis < 10_000_000) {
      return String(satoshis / 100_000) + ' mBCH'
    } else if (satoshis < 100_000_000) {
      return String(satoshis / 1_000_000) + ' cBCH'
    } else {
      return String(satoshis / 100_000_000) + ' BCH'
    }
  } else if (format.type === 'fiat') {
    const conversion = format.conversion
    const cent = satoshis * conversion
    if (cent < 100) {
      return Math.floor(cent * 1_000) / 1_000 + '¢'
    } else {
      return '$' + (Math.floor(cent * 1_000) / 100_000)
    }
  }
}

export const toElectrumScriptHash = function (addr) {
  const scriptHash = cashlib.Script.buildPublicKeyHashOut(addr)
  const scriptHashRaw = scriptHash.toBuffer()
  const digest = cashlib.crypto.Hash.sha256(scriptHashRaw)
  const digestHexReversed = digest.reverse().toString('hex')
  return digestHexReversed
}
