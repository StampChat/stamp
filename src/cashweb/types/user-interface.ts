import { PublicKey } from 'bitcore-lib-xpi'
import { MessageItem, ReactionObject } from './messages'
import { Utxo } from './utxo'

export interface UIStealthOutput {
  type: 'stealth'
  txId: string
  satoshis: number
  outputIndex: number
}

export interface UIStampOutput {
  type: 'stamp'
  txId: string
  satoshis: number
  outputIndex: number
}

export type UIOutput = UIStealthOutput | UIStampOutput

export type ReceivedMessage = {
  outbound: boolean
  status: string
  items: MessageItem[]
  reactions: ReactionObject[]
  serverTime: number
  receivedTime: number
  outpoints: Utxo[]
  senderAddress: string
  destinationAddress: string
}

export type ReceivedMessageWrapper = {
  outbound: boolean
  senderAddress: string
  copartyAddress: string
  copartyPubKey: PublicKey
  index: string
  stampValue: number
  message: Readonly<ReceivedMessage>
}
