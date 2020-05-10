export const arrayBufferToBase64 = function (buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export const entryToImage = function (entry) {
  const rawAvatar = entry.getEntryData()

  const value = entry.getHeadersList()[0].getValue()
  const avatarDataURL = 'data:' + value + ';base64,' + arrayBufferToBase64(rawAvatar)
  return avatarDataURL
}
