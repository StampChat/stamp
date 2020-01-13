import crypto from '../../../src/relay/crypto'
import { PrivateKey } from 'bitcore-lib-cash'

function getRandomInt (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

test('Encrypt', () => {
  let raw = new ArrayBuffer(8)
  let privKey = PrivateKey()
  let destPubKey = PrivateKey().toPublicKey()
  crypto.encrypt(raw, privKey, destPubKey)
})

test('Decrypt', () => {
  let length = 8
  let raw = new Uint8Array(new ArrayBuffer(length))
  for (let i = 0; i < length; i++) {
    raw[i] = getRandomInt(255)
  }
  let sourcePrivKey = PrivateKey()
  let sourcePubKey = sourcePrivKey.toPublicKey()
  let destPrivKey = PrivateKey()
  let destPubKey = destPrivKey.toPublicKey()
  let { cipherText, ephemeralPubKey } = crypto.encrypt(raw, sourcePrivKey, destPubKey)
  let plainText = crypto.decrypt(cipherText, destPrivKey, sourcePubKey, ephemeralPubKey)
  expect(plainText).toStrictEqual(raw)
})
