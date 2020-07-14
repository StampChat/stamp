import cashlib from 'bitcore-lib-cash'
import { mnemonicToSeedSync } from 'bip39'

self.addEventListener('message', function (event) {
  const hexSeed = mnemonicToSeedSync(event.data).toString('hex')

  // eslint-disable-next-line new-cap
  const xPrivKey = new cashlib.HDPrivateKey.fromSeed(hexSeed)
  self.postMessage(xPrivKey.toObject())
})
