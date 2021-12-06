import { MessageWrapper } from '../../types/messages'
export class MessageResult implements IteratorYieldResult<MessageWrapper> {
  done: false
  value: MessageWrapper

  constructor(value: MessageWrapper) {
    this.done = false
    this.value = value
  }
}

export class MessageReturnResult
  implements IteratorReturnResult<MessageWrapper | undefined>
{
  done: true
  value: MessageWrapper | undefined

  constructor(value: MessageWrapper | undefined = undefined) {
    this.done = true
    this.value = value
  }
}

export interface MessageStore {
  getMessage(payloadDigest: string): Promise<MessageWrapper | undefined>
  saveMessage(message: MessageWrapper): void
  deleteMessage(payloadDigest: string): void
  mostRecentMessageTime(newLastServerTime?: number): Promise<number>
  getIterator(): Promise<AsyncIterableIterator<MessageWrapper>>
  clear(): Promise<void>
}
