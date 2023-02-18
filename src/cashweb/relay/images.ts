import assert from 'assert'
import btoa from 'btoa'
import { Entry } from '../registry/metadata_pb'

export function arrayBufferToBase64(buffer: Uint8Array) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function entryToImage(entry: Entry) {
  const rawAvatar = entry.getBody()
  const value = entry.getHeadersList()[0].getValue()
  assert(
    typeof rawAvatar !== 'string',
    'rawAvatar should not have been a string',
  )
  const avatarDataURL =
    'data:' + value + ';base64,' + arrayBufferToBase64(rawAvatar)
  return avatarDataURL
}
