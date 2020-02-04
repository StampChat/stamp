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
  },
  unixToStamp (unixTime, dateNow) {
    let seconds = (dateNow - unixTime) / 1000
    if (seconds > 2 * 24 * 3600) {
      return 'a few days ago'
    }
    if (seconds > 24 * 3600) {
      return 'yesterday'
    }
    if (seconds > 3600) {
      return 'a few hours ago'
    }
    if (seconds > 1800) {
      return 'half an hour ago'
    }
    if (seconds > 120) {
      return Math.floor(seconds / 60) + ' minutes ago'
    }
    if (seconds > 60) {
      return '1 minute ago'
    }
    return 'just now'
  }
}
