import { PrivateKey } from 'bitcore-lib-cash'

const forge = require('node-forge')
const cashlib = require('bitcore-lib-cash')

export default {
  encrypt (raw, privKey, destPubKey) {
    // Generate new (random) emphemeral key
    let ephemeralPrivKey = PrivateKey()

    // Construct DH key
    let diffieKeyPoint = destPubKey.point.mul(ephemeralPrivKey.point) + privKey.point
    let diffieKeyPointRaw = cashlib.crypto.Point.pointToCompressed(diffieKeyPoint)

    // Extract encryption params from digest
    let digest = cashlib.sha256(diffieKeyPointRaw)
    let iv = digest.slice(0, 16)
    let key = digest.slice(16)

    // Encrypt entries
    let cipher = forge.cipher.createCipher('AES-CBC', key)
    cipher.start({ iv })
    cipher.update(raw)
    cipher.finish()
    return cipher.output
  }
}
