import { PayloadConstructor } from '../../../src/cashweb/relay/crypto'
import { PrivateKey } from 'bitcore-lib-cash'

const payloadConstructor = new PayloadConstructor({networkName: 'test-net'})

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
  const sharedKey = payloadConstructor.constructSharedKey(privateKey, destinationPublicKey, salt)

  payloadConstructor.encrypt(sharedKey, plainText)
})

test('Decrypt', () => {
  const length = 300
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
  const sharedKey = payloadConstructor.constructSharedKey(privateKey, destinationPublicKey, salt)
  const cipherText = payloadConstructor.encrypt(sharedKey, prePlainText)
  const postPlainText = payloadConstructor.decrypt(sharedKey, cipherText)

  expect(postPlainText).toStrictEqual(prePlainText)
})

test('StealthKey', () => {
  const destPrivKey = PrivateKey()
  const destPubKey = destPrivKey.toPublicKey()

  const ephemeralPrivKey = PrivateKey()
  const ephemeralPubKey = ephemeralPrivKey.toPublicKey()

  const { stealthPublicKey } = payloadConstructor.constructStealthPublicKey(ephemeralPrivKey, destPubKey)
  const { stealthPrivateKey } = payloadConstructor.constructStealthPrivateKey(ephemeralPubKey, destPrivKey)

  expect(stealthPublicKey.toBuffer()).toStrictEqual(stealthPrivateKey.toPublicKey().toBuffer())
})
