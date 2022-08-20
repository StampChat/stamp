import assert from 'assert'
import { PayloadEntry } from './relay_pb'
import { MessageItem } from '../types/messages'
import { PublicKey } from 'bitcore-lib-xpi'
import { Wallet } from '../wallet'
import { MessageConstructor } from './constructors'
import { Utxo } from '../types/utxo'
import { Transaction } from 'bitcore-lib-xpi'
import { UIOutput } from '../types/user-interface'

export function encodeEntry(
  item: MessageItem,
  destinationPublicKey: PublicKey,
  {
    wallet,
    messageConstructor,
    getPubKey,
  }: {
    wallet: Wallet
    messageConstructor: MessageConstructor
    getPubKey: (address: string) => PublicKey | null
  },
): [PayloadEntry, Transaction[], Utxo[], UIOutput[]] {
  // TODO: internal type does not match protocol. Consistency is good.
  if (item.type === 'stealth') {
    const { paymentEntry, transactionBundle } =
      messageConstructor.constructStealthEntry({
        ...item,
        wallet: wallet,
        destPubKey: destinationPublicKey,
      })
    const transactions: Transaction[] = []
    const stagedUtxos: Utxo[] = []
    const outpoints = transactionBundle
      .map(({ transaction, vouts, usedUtxos }) => {
        transactions.push(transaction)
        stagedUtxos.push(...usedUtxos)
        return vouts.map(
          vout =>
            ({
              type: 'stealth',
              txId: transaction.txid,
              satoshis: transaction.outputs[vout].satoshis,
              outputIndex: vout,
            } as UIOutput),
        )
      })
      .flat(1)
    return [paymentEntry, transactions, stagedUtxos, outpoints]
  }
  // TODO: internal type does not match protocol. Consistency is good.
  if (item.type === 'text') {
    return [messageConstructor.constructTextEntry({ ...item }), [], [], []]
  }
  if (item.type === 'forward') {
    const forwardEntry = messageConstructor.constructForwardEntry({
      ...item,
      encodeEntry: (item: MessageItem) =>
        encodeEntry(item, destinationPublicKey, {
          wallet,
          messageConstructor,
          getPubKey,
        }),
      getPubKey,
    })

    return [forwardEntry, [], [], []]
  }
  if (item.type === 'reply') {
    return [messageConstructor.constructReplyEntry({ ...item }), [], [], []]
  }
  if (item.type === 'image') {
    return [messageConstructor.constructImageEntry({ ...item }), [], [], []]
  }
  if (item.type === 'p2pkh') {
    const { entry, transaction, usedUtxos } =
      messageConstructor.constructP2PKHEntry({
        ...item,
        wallet: wallet,
      })

    return [entry, [transaction], usedUtxos, []]
  }
  assert(false, 'Unknown entry type')
}
