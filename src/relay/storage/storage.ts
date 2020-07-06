
import { PrivateKey } from 'bitcore-lib-cash'

export interface Outpoint {
  address: string;
  privKey: PrivateKey; // This is okay, we don't add it to the wallet.
  satoshis: number;
  txId: string;
  outputIndex: number;
  type: string;
}

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MessageWrapper {
    newMsg: Message;
    index: string;
    outbound: boolean;
    address: string;
    senderAddress: string;
    pubKey: string;
}

export class MessageResult implements IteratorYieldResult<MessageWrapper> {
    done: false;
    value: MessageWrapper;

    constructor (value: MessageWrapper) {
      this.done = false
      this.value = value
    }
}

export class MessageReturnResult implements IteratorReturnResult<MessageWrapper | undefined> {
    done: true;
    value: MessageWrapper | undefined;

    constructor (value: MessageWrapper | undefined = undefined) {
      this.done = true
      this.value = value
    }
}

export interface MessageStore {
    getMessage(payloadDigest: string): Promise<MessageWrapper | undefined>;
    saveMessage(message: MessageWrapper): void;
    deleteMessage(payloadDigest: string): void;
    mostRecentMessageTime (newLastServerTime: number): Promise<number>;
    getIterator (): Promise<AsyncIterator<MessageWrapper>>;
}
