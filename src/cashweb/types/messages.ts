import { Outpoint } from './outpoint'

export interface Entry {
  // Todo should match proto
  type: string;
  // Todo needs headers
}

export interface Message {
  outbound: boolean;
  status: string;
  receivedTime: number;
  serverTime: number;
  items: Array<Entry>;
  outpoints: Array<Outpoint>;
  senderAddress: string;
}

export interface MessageWrapper {
  newMsg: Message;
  index: string;
  outbound: boolean;
  senderAddress: string;
  copartyAddress: string;
}
