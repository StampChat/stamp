import {
  encrypt, decrypt, constructStealthPublicKey,
  constructStealthPrivateKey, constructSharedKey
} from '../../../src/relay/crypto'
import { PrivateKey } from 'bitcore-lib-cash'

function getRandomInt (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

test('Encrypt', () => {
  const length = 8
  const plainText = new Uint8Array(new ArrayBuffer(length))
  for (let i = 0; i < length; i++) {
    plainText[i] = getRandomInt(255)
  }

  const salt = new Uint8Array(new ArrayBuffer(32))
  for (let i = 0; i < length; i++) {
    salt[i] = getRandomInt(255)
  }

  const privateKey = PrivateKey()
  const destinationPublicKey = PrivateKey().toPublicKey()
  const sharedKey = constructSharedKey(privateKey, destinationPublicKey, salt)

  encrypt(sharedKey, plainText)
})

test('Decrypt', () => {
  const length = 8
  const prePlainText = new Uint8Array(new ArrayBuffer(length))
  for (let i = 0; i < length; i++) {
    prePlainText[i] = getRandomInt(255)
  }

  const salt = new Uint8Array(new ArrayBuffer(32))
  for (let i = 0; i < length; i++) {
    salt[i] = getRandomInt(255)
  }

  const privateKey = PrivateKey()
  const destinationPublicKey = PrivateKey().toPublicKey()
  const sharedKey = constructSharedKey(privateKey, destinationPublicKey, salt)

  const cipherText = encrypt(sharedKey, prePlainText)
  const postPlainText = decrypt(sharedKey, cipherText)
  expect(postPlainText).toStrictEqual(prePlainText)
})

test('StealthKey', () => {
  const destPrivKey = PrivateKey()
  const destPubKey = destPrivKey.toPublicKey()

  const ephemeralPrivKey = PrivateKey()
  const ephemeralPubKey = ephemeralPrivKey.toPublicKey()

  const { stealthPublicKey } = constructStealthPublicKey(ephemeralPrivKey, destPubKey)

  const { stealthPrivateKey } = constructStealthPrivateKey(ephemeralPubKey, destPrivKey)

  expect(stealthPublicKey.toBuffer()).toStrictEqual(stealthPrivateKey.toPublicKey().toBuffer())
})
