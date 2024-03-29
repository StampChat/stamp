import { HDPrivateKey } from 'bitcore-lib-xpi'
import { mnemonicToSeedSync } from 'bip39'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: Worker = self as any

ctx.addEventListener('message', function (event) {
  const hexSeed = mnemonicToSeedSync(event.data).toString('hex')

  // eslint-disable-next-line new-cap
  const xPrivKey = HDPrivateKey.fromSeed(hexSeed)
  ctx.postMessage(xPrivKey.toObject())
})
