import { crypto, Address } from 'bitcore-lib-xpi'
import { colorSalt } from './constants'

export function formatBalance (balance) {
  if (balance < 1_000) {
    return String(balance) + ' sats'
  }

  if (balance < 1_000_000) {
    return String(balance / 1_000) + ' kilosats'
  }

  if (balance < 1_000_000_000) {
    return String(balance / 1_000_000) + ' Lotus'
  }

  if (balance < 1_000_000_000_000) {
    return String(balance / 1_000_000_000) + ' KiloLotus'
  }

  if (balance < 1_000_000_000_000_000_000) {
    return String(balance / 1_000_000_000_000) + ' MegaLotus'
  }
}

export function addressColor (address) {
  const rawAddress = address.toBuffer()

  // Add salt
  const saltedAddress = Buffer.concat([rawAddress, colorSalt])

  const hashbuf = crypto.Hash.sha256(saltedAddress)
  const hue = hashbuf[0]
  const saturation = hashbuf[1] / 255

  return { hue, saturation }
}

export function addressColorFromStr (addrStr) {
  const addrObj = new Address(addrStr)
  const { hue, saturation } = addressColor(addrObj)
  const color = `hsl(${hue}, ${saturation * 100}%, 60%)`
  return color
}
