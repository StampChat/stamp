import {
  encrypt, decrypt, constructStampPubKey,
  constructStampPrivKey, constructStealthPubKey,
  constructStealthPrivKey, encryptEphemeralKey, decryptEphemeralKey
} from '../../../src/relay/crypto'
import { PrivateKey, crypto } from 'bitcore-lib-cash'

function getRandomInt (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

test('Encrypt', () => {
  const raw = new ArrayBuffer(8)
  const privKey = PrivateKey()
  const destPubKey = PrivateKey().toPublicKey()
  encrypt(raw, privKey, destPubKey)
})

test('Decrypt', () => {
  const length = 8
  const raw = new Uint8Array(new ArrayBuffer(length))
  for (let i = 0; i < length; i++) {
    raw[i] = getRandomInt(255)
  }
  const sourcePrivKey = PrivateKey()
  const sourcePubKey = sourcePrivKey.toPublicKey()
  const destPrivKey = PrivateKey()
  const destPubKey = destPrivKey.toPublicKey()
  const { cipherText, ephemeralPrivKey } = encrypt(raw, sourcePrivKey, destPubKey)
  const plainText = decrypt(cipherText, destPrivKey, sourcePubKey, ephemeralPrivKey.toPublicKey())
  expect(plainText).toStrictEqual(raw)
})

test('Stamp Signatures', () => {
  const preimage = Buffer.from('hello')
  const digest = crypto.Hash.sha256(preimage)
  const privKey = PrivateKey()
  const publicKey = privKey.toPublicKey()
  const stampPublicKey = constructStampPubKey(digest, publicKey)
  const stampPrivKey = constructStampPrivKey(digest, privKey)
  const stampPublicKeyDerived = stampPrivKey.toPublicKey()
  expect(stampPublicKey.toBuffer()).toStrictEqual(stampPublicKeyDerived.toBuffer())
})

test('StealthKey', () => {
  const destPrivKey = PrivateKey()
  const destPubKey = destPrivKey.toPublicKey()

  const ephemeralPrivKey = PrivateKey()
  const ephemeralPubKey = ephemeralPrivKey.toPublicKey()

  const stealthPubKey = constructStealthPubKey(ephemeralPrivKey, destPubKey)

  const stealthPrivKey = constructStealthPrivKey(ephemeralPubKey, destPrivKey)
  const stealthPubKeyExpected = stealthPrivKey.toPublicKey()

  expect(stealthPubKey.toBuffer()).toStrictEqual(stealthPubKeyExpected.toBuffer())
})

test('EncryptEphemeral', () => {
  const privKey = PrivateKey()
  const ephemeralPrivKey = PrivateKey()
  const entriesDigest = Buffer.from(new ArrayBuffer(32))

  encryptEphemeralKey(ephemeralPrivKey, privKey, entriesDigest)
})

test('DecryptEphemeral', () => {
  const privKey = PrivateKey()
  const ephemeralPrivKey = PrivateKey()
  const entriesDigest = Buffer.from(new ArrayBuffer(32))

  const cipherText = encryptEphemeralKey(ephemeralPrivKey, privKey, entriesDigest)

  const newEphemeralPrivKey = decryptEphemeralKey(cipherText, privKey, entriesDigest)

  expect(ephemeralPrivKey.toBuffer()).toStrictEqual(newEphemeralPrivKey.toBuffer())
})
