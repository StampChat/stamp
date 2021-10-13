import { Outpoint } from './outpoint'

export interface ReplyItem {
  type: 'reply'
  payloadDigest: string
}

export interface TextItem {
  type: 'text'
  text: string
}

export interface P2PKHSendItem {
  type: 'p2pkh'
  address: string
  amount: number
}

export interface StealthItem {
  type: 'stealth'
  amount: number
  txId?: string
  outputIndex?: number
}

export interface ImageItem {
  type: 'image'
  image: string,
}

export type MessageItem = StealthItem | P2PKHSendItem | TextItem | ReplyItem | ImageItem

export interface Message {
  outbound: boolean;
  status: string;
  receivedTime: number;
  serverTime: number;
  items: Array<MessageItem>;
  outpoints: Array<Outpoint>;
  senderAddress: string;
}

export interface MessageWrapper {
  message: Message;
  index: string;
  outbound: boolean;
  senderAddress: string;
  copartyAddress: string;
}
