const cashlib = require('bitcore-lib-cash')
import { colorSalt } from './constants'

export const formatBalance = function (balance) {
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
}

export const toElectrumScriptHash = function (addr) {
  const scriptHash = cashlib.Script.buildPublicKeyHashOut(addr)
  const scriptHashRaw = scriptHash.toBuffer()
  const digest = cashlib.crypto.Hash.sha256(scriptHashRaw)
  const digestHexReversed = digest.reverse().toString('hex')
  return digestHexReversed
}

export const addressColor = function (addr) {
  const rawAddress = addr.toBuffer()

  // Add salt
  const saltedAddress = Buffer.concat([rawAddress, colorSalt])

  const hashbuf = cashlib.crypto.Hash.sha256(saltedAddress)
  const hue = hashbuf[0]
  const saturation = hashbuf[1] / 255

  return { hue, saturation }
}

export const addressColorFromStr = function (addrStr) {
  const addrObj = new cashlib.Address(addrStr)
  const { hue, saturation } = addressColor(addrObj)
  const color = `hsl(${hue}, ${saturation * 100}%, 60%)`
  return color
}
