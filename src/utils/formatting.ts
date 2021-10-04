import { Address, crypto } from 'bitcore-lib-xpi'
import { colorSalt } from './constants'

export function formatBalance (balance: number) {
  if (balance < 1_000) {
    return String(balance) + ' sats'
  }

  return (balance / 1_000_000).toFixed(2) + ' Lotus'
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
