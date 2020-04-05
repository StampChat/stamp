import {
  encrypt, decrypt, constructStampPubKey,
  constructStampPrivKey, constructStealthPubKey,
  constructStealthPrivKey, encryptEphemeralKey, decryptEphemeralKey
} from '../../../src/relay/crypto'
import { PrivateKey } from 'bitcore-lib-cash'

const cashlib = require('bitcore-lib-cash')

function getRandomInt (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

test('Encrypt', () => {
  let raw = new ArrayBuffer(8)
  let privKey = PrivateKey()
  let destPubKey = PrivateKey().toPublicKey()
  encrypt(raw, privKey, destPubKey)
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
  let { cipherText, ephemeralPrivKey } = encrypt(raw, sourcePrivKey, destPubKey)
  let plainText = decrypt(cipherText, destPrivKey, sourcePubKey, ephemeralPrivKey.toPublicKey())
  expect(plainText).toStrictEqual(raw)
})

test('Stamp Signatures', () => {
  let preimage = Buffer.from('hello')
  let digest = cashlib.crypto.Hash.sha256(preimage)
  let privKey = PrivateKey()
  let publicKey = privKey.toPublicKey()
  let stampPublicKey = constructStampPubKey(digest, publicKey)
  let stampPrivKey = constructStampPrivKey(digest, privKey)
  let stampPublicKeyDerived = stampPrivKey.toPublicKey()
  expect(stampPublicKey.toBuffer()).toStrictEqual(stampPublicKeyDerived.toBuffer())
})

test('StealthKey', () => {
  let destPrivKey = PrivateKey()
  let destPubKey = destPrivKey.toPublicKey()

  let ephemeralPrivKey = PrivateKey()
  let ephemeralPubKey = ephemeralPrivKey.toPublicKey()

  let stealthPubKey = constructStealthPubKey(ephemeralPrivKey, destPubKey)

  let stealthPrivKey = constructStealthPrivKey(ephemeralPubKey, destPrivKey)
  let stealthPubKeyExpected = stealthPrivKey.toPublicKey()

  expect(stealthPubKey.toBuffer()).toStrictEqual(stealthPubKeyExpected.toBuffer())
})

test('EncryptEphemeral', () => {
  let privKey = PrivateKey()
  let ephemeralPrivKey = PrivateKey()
  let entriesDigest = Buffer.from(new ArrayBuffer(32))

  encryptEphemeralKey(ephemeralPrivKey, privKey, entriesDigest)
})

test('DecryptEphemeral', () => {
  let privKey = PrivateKey()
  let ephemeralPrivKey = PrivateKey()
  let entriesDigest = Buffer.from(new ArrayBuffer(32))

  let cipherText = encryptEphemeralKey(ephemeralPrivKey, privKey, entriesDigest)

  let newEphemeralPrivKey = decryptEphemeralKey(cipherText, privKey, entriesDigest)

  expect(ephemeralPrivKey.toBuffer()).toStrictEqual(newEphemeralPrivKey.toBuffer())
})
