import cashlib from 'bitcore-lib-cash'
import bip39 from 'bip39'

self.addEventListener('message', function (event) {
  const hexSeed = bip39.mnemonicToSeedSync(event.data).toString('hex')

  // eslint-disable-next-line new-cap
  const xPrivKey = new cashlib.HDPrivateKey.fromSeed(hexSeed)
  self.postMessage(xPrivKey.toObject())
})
