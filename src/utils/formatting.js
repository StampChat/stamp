import { Script, crypto, Address } from 'bitcore-lib-cash'
import { colorSalt } from './constants'

export const formatBalance = function (balance) {
  if (balance < 1_000) {
    return String(balance) + ' sats'
  }

  if (balance < 1_000_000) {
    return String(balance / 1_000) + ' kilosats'
  }

  if (balance < 1_000_000_000) {
    return String(balance / 1_000_000) + ' megasats'
  }

  if (balance < 1_000_000_000_000_000) {
    return String(balance / 1_000_000_000) + ' gigasats'
  }

  if (balance < 1_000_000_000_000_000_000) {
    return String(balance / 1_000_000_000_000) + ' terasats'
  }
}

export const toElectrumScriptHash = function (address) {
  const scriptHash = Script.buildPublicKeyHashOut(address)
  const scriptHashRaw = scriptHash.toBuffer()
  const digest = crypto.Hash.sha256(scriptHashRaw)
  const digestHexReversed = digest.reverse().toString('hex')
  return digestHexReversed
}

export const addressColor = function (address) {
  const rawAddress = address.toBuffer()

  // Add salt
  const saltedAddress = Buffer.concat([rawAddress, colorSalt])

  const hashbuf = crypto.Hash.sha256(saltedAddress)
  const hue = hashbuf[0]
  const saturation = hashbuf[1] / 255

  return { hue, saturation }
}

export const addressColorFromStr = function (addrStr) {
  const addrObj = new Address(addrStr)
  const { hue, saturation } = addressColor(addrObj)
  const color = `hsl(${hue}, ${saturation * 100}%, 60%)`
  return color
}
