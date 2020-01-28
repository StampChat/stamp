const cashlib = require('bitcore-lib-cash')

export default {
  formatBalance (balance) {
    if (balance < 1_000) {
      return String(balance) + ' sats'
    } else if (balance < 100_000) {
      return String(balance / 100) + ' uBCH'
    } else if (balance < 10_000_000) {
      return String(balance / 100_000) + ' mBCH'
    } else if (balance < 100_000_000) {
      return String(balance / 1_000_000) + ' cBCH'
    } else {
      return String(balance / 100_000_000) + ' BCH'
    }
  },
  toElectrumScriptHash (addr) {
    let scriptHash = cashlib.Script.buildPublicKeyHashOut(addr)
    let scriptHashRaw = scriptHash.toBuffer()
    let digest = cashlib.crypto.Hash.sha256(scriptHashRaw)
    let digestHexReversed = digest.reverse().toString('hex')
    return digestHexReversed
  }

}
