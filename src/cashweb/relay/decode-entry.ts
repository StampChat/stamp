import assert from 'assert'
import type { ReplyItem, StealthItem, ImageItem } from '../types/messages'
import { PayloadEntry } from './relay_pb'
import { entryToImage } from './images'
import stealth from './stealth_pb'
import { TextItem, MessageItem } from '../types/messages'
import { PublicKey, crypto, Transaction, HDPrivateKey } from 'bitcore-lib-xpi'
import { Wallet } from '../wallet'
import { calcUtxoId } from '../wallet/helpers'
import { Utxo } from '../types/utxo'

export async function decodeEntry(
  entry: PayloadEntry,
  outbound: boolean,
  {
    networkName,
    wallet,
    constructHDStealthPrivateKey,
  }: {
    networkName: string
    wallet: Wallet
    constructHDStealthPrivateKey: (pubKey: PublicKey) => HDPrivateKey
  },
): Promise<[MessageItem, Utxo[]] | null> {
  // If address data doesn't exist then add it
  const kind = entry.getKind()
  const outpoints: Utxo[] = []

  if (kind === 'reply') {
    const entryData = entry.getBody()
    const payloadDigest = Buffer.from(entryData).toString('hex')
    return [
      {
        type: 'reply',
        payloadDigest,
      } as ReplyItem,
      outpoints,
    ]
  }

  if (kind === 'text-utf8') {
    const entryData = entry.getBody()
    if (typeof entryData === 'string') {
      return [
        {
          type: 'text',
          text: entryData,
        } as TextItem,
        outpoints,
      ]
    }
    assert(
      typeof entryData !== 'string',
      `text entry data was a string ${entryData}`,
    )
    const text = new TextDecoder().decode(entryData)
    return [
      {
        type: 'text',
        text,
      } as TextItem,
      outpoints,
    ]
  }

  if (kind === 'stealth-payment') {
    const entryData = entry.getBody()
    assert(
      typeof entryData !== 'string',
      'entryData should not have string type',
    )
    const stealthMessage =
      stealth.StealthPaymentEntry.deserializeBinary(entryData)

    // Add stealth outputs
    const outpointsList = stealthMessage.getOutpointsList()
    const ephemeralPubKeyRaw = stealthMessage.getEphemeralPubKey()
    const ephemeralPubKey = PublicKey.fromBuffer(
      Buffer.from(ephemeralPubKeyRaw),
    )
    const stealthHDPrivKey = constructHDStealthPrivateKey(ephemeralPubKey)

    let stealthValue = 0
    for (const [i, outpoint] of outpointsList.entries()) {
      const stealthTxRaw = Buffer.from(outpoint.getStealthTx())
      const stealthTx = new Transaction(stealthTxRaw)
      const txId = stealthTx.txid
      const vouts = outpoint.getVoutsList()

      if (outbound) {
        for (const input of stealthTx.inputs) {
          // Don't add these outputs to our wallet. They're the other persons
          const utxoId = calcUtxoId({
            txId: input.prevTxId.toString('hex'),
            outputIndex: input.outputIndex,
          })
          await wallet.deleteUtxo(utxoId)
        }
      }

      for (const [j, outputIndex] of vouts.entries()) {
        const output = stealthTx.outputs[outputIndex]
        const satoshis = output.satoshis

        const outpointPrivKey = stealthHDPrivKey
          .deriveChild(44)
          .deriveChild(145)
          .deriveChild(i)
          .deriveChild(j).privateKey
        const address = output.script.toAddress(networkName) // TODO: Make generic
        // Network doesn't really matter here, just serves as a placeholder to avoid needing to compute the
        // HASH160(SHA256(point)) ourself
        // Also, ensure the point is compressed first before calculating the address so the hash is deterministic
        const computedAddress = new PublicKey(
          crypto.Point.pointToCompressed(outpointPrivKey.toPublicKey().point),
        ).toAddress(networkName)
        if (
          !outbound &&
          !address.toBuffer().equals(computedAddress.toBuffer())
        ) {
          console.error('invalid stealth address, ignoring')
          return null
        }
        // total up the satoshis only if we know the txn was valid
        stealthValue += satoshis

        const stampOutput = {
          type: 'stealth',
          address: address.toCashAddress(),
          satoshis,
          outputIndex,
          txId,
        } as Utxo
        outpoints.push(stampOutput)
        if (outbound) {
          // Don't add these outputs to our wallet. They're the other persons
          continue
        }
        wallet.putUtxo({
          ...stampOutput,
          privKey: Object.freeze(outpointPrivKey),
        })
      }
    }
    return [
      {
        type: 'stealth',
        amount: stealthValue,
      } as StealthItem,
      outpoints,
    ]
  }

  if (kind === 'image') {
    const image = entryToImage(entry)
    return [
      {
        type: 'image',
        image,
      } as ImageItem,
      outpoints,
    ]
  }

  console.error('Unknown entry Kind', kind)
  return null
}
