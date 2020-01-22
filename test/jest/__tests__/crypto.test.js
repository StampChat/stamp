import crypto from '../../../src/relay/crypto'
import { PrivateKey } from 'bitcore-lib-cash'

const cashlib = require('bitcore-lib-cash')

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

test('Stamp Signatures', () => {
  let preimage = Buffer.from('hello')
  let digest = cashlib.crypto.Hash.sha256(preimage)
  let privKey = PrivateKey()
  let publicKey = privKey.toPublicKey()
  let stampPublicKey = crypto.constructStampPubKey(digest, publicKey)
  let stampPrivKey = crypto.constructStampPrivKey(digest, privKey)
  let stampPublicKeyDerived = stampPrivKey.toPublicKey()
  expect(stampPublicKey.toBuffer()).toStrictEqual(stampPublicKeyDerived.toBuffer())
})
