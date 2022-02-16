import { Address, crypto } from 'bitcore-lib-xpi'
import { colorSalt } from './constants'

export function formatBalance (balance: number) {
  const isNegative = balance < 0 ? '-' : ''
  const sats = Math.abs(balance)
  if (sats < 1_000) {
    return isNegative + String(sats) + ' sats'
  }

  return isNegative + (sats / 1_000_000).toFixed(2) + ' Lotus'
}

export function addressColor (address: Address) {
  const rawAddress = address.toBuffer()

  // Add salt
  const saltedAddress = Buffer.concat([rawAddress, colorSalt])

  const hashbuf = crypto.Hash.sha256(saltedAddress)
  const hue = hashbuf[0]
  const saturation = hashbuf[1] / 255

  return { hue, saturation }
}

export function addressColorFromStr (addrStr: string) {
  const addrObj = new Address(addrStr)
  const { hue, saturation } = addressColor(addrObj)
  const color = `hsl(${hue}, ${saturation * 100}%, 60%)`
  return color
}

export function messageBackgroundColor (outbound: boolean, isDark: boolean) {
  if (outbound) {
    return isDark ? 'deep-purple' : 'deep-purple-2'
  } else {
    return isDark ? 'blue-grey-8' : 'blue-grey-2'
  }
}
