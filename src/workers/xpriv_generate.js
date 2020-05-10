const cashlib = require('bitcore-lib-cash')
const bip39 = require('bip39')

self.addEventListener('message', async function (event) {
  const hexSeed = bip39.mnemonicToSeedSync(event.data).toString('hex')

  // eslint-disable-next-line new-cap
  const xPrivKey = new cashlib.HDPrivateKey.fromSeed(hexSeed)
  self.postMessage(xPrivKey.toObject())
})
