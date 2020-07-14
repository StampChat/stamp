import { HDPrivateKey } from 'bitcore-lib-cash'
import { mnemonicToSeedSync } from 'bip39'

self.addEventListener('message', function (event) {
  const hexSeed = mnemonicToSeedSync(event.data).toString('hex')

  // eslint-disable-next-line new-cap
  const xPrivKey = new HDPrivateKey.fromSeed(hexSeed)
  self.postMessage(xPrivKey.toObject())
})
