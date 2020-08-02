/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageStore, MessageResult, MessageWrapper, MessageReturnResult } from './storage'
import level from 'level'
import { join } from 'path'

const metadataKeys = {
  schemaVersion: 'schemaVersion',
  lastServerTime: 'lastServerTime'
}

class MessageIterator implements AsyncIterator<MessageWrapper> {
  iterator: any;
  db: any;

  constructor (db: any) {
    this.db = db
  }

  async next (): Promise<IteratorResult<MessageWrapper>> {
    const value: MessageWrapper = await new Promise((resolve, reject) => {
      this.iterator.next((error: Error, key: string, value: string) => {
        if (error) {
          reject(error)
        }
        if (!key) {
          this.iterator.end((error: Error) => {
            if (error) {
              reject(error)
            }
            resolve()
          })
          resolve()
          return
        }
        const parsedValue: MessageWrapper = JSON.parse(value)
        resolve(parsedValue)
      })
    })
    if (!value) {
      return new MessageReturnResult()
    }
    return new MessageResult(value)
  }

  async return (): Promise<IteratorResult<MessageWrapper>> {
    return new Promise((resolve, reject) => {
      this.iterator.end((error: Error) => {
        this.db.close()
        if (error) {
          reject(error)
        }
        resolve({ done: true, value: undefined })
      })
    })
  }

  [Symbol.asyncIterator] () {
    this.iterator = this.db.iterator()
    return this
  }
}

const currentSchemaVersion = 1

export class LevelMessageStore implements MessageStore {
  private messageDbLocation: string
  private metadataDbLocation: string
  private schemaVersion?: number

  constructor (location: string) {
    this.messageDbLocation = join(location, 'messages')
    this.metadataDbLocation = join(location, 'metadata')
  }

  private async getMessageDatabase () {
    const db = level(this.messageDbLocation)
    const dbSchemaVersion = await this.getSchemaVersion()
    if (!dbSchemaVersion) {
      await this.setSchemaVersion(currentSchemaVersion)
    } else if (dbSchemaVersion < currentSchemaVersion) {
      console.warn('Outdated DB, may need migration')
    } else if (dbSchemaVersion > currentSchemaVersion) {
      console.warn('Newer DB found. Client downgraded?')
    }
    return db
  }

  private getMetadataDatabase () {
    return level(this.messageDbLocation)
  }

  async getMessage (payloadDigest: string): Promise<MessageWrapper | undefined> {
    const db = await this.getMessageDatabase()
    try {
      const value = await db.get(payloadDigest)
      return JSON.parse(value)
    } catch (err) {
      if (err.type === 'NotFoundError') {
        return
      }
      throw err
    } finally {
      db.close()
    }
  }

  async deleteMessage (payloadDigest: string) {
    const db = await this.getMessageDatabase()
    try {
      await db.del(payloadDigest)
    } finally {
      db.close()
    }
  }

  async saveMessage (message: MessageWrapper) {
    const index = message.index
    const db = await this.getMessageDatabase()
    try {
      await this.mostRecentMessageTime(message.newMsg.serverTime)
      await db.put(index, JSON.stringify(message))
    } finally {
      db.close()
    }
  }

  async mostRecentMessageTime (newLastServerTime: number): Promise<number> {
    const db = await this.getMetadataDatabase()
    const jsonNewLastServerTime = JSON.stringify(newLastServerTime || 0)
    try {
      const lastServerTimeString: string = await db.get(metadataKeys.lastServerTime)
      const lastServerTime = JSON.parse(lastServerTimeString)
      if (!lastServerTime) {
        await db.put(metadataKeys.lastServerTime, jsonNewLastServerTime)
      }
      if (!newLastServerTime) {
        return JSON.parse(lastServerTime)
      }
      if (lastServerTime < newLastServerTime) {
        await db.put(metadataKeys.lastServerTime, jsonNewLastServerTime)
      }
      return Math.max(newLastServerTime, lastServerTime)
    } catch (err) {
      if (err.type === 'NotFoundError') {
        if (newLastServerTime) {
          await db.put(metadataKeys.lastServerTime, jsonNewLastServerTime)
          return newLastServerTime
        }
        return 0
      }
      throw err
    } finally {
      db.close()
    }
  }

  private async getSchemaVersion (): Promise<number> {
    if (this.schemaVersion) {
      return this.schemaVersion
    }

    const db = await this.getMetadataDatabase()
    try {
      const value: string = await db.get(metadataKeys.schemaVersion)
      return JSON.parse(value)
    } catch (err) {
      if (err.type === 'NotFoundError') {
        return 0
      }
      throw err
    } finally {
      db.close()
    }
  }

  private async setSchemaVersion (schemaVersion: number) {
    const db = await this.getMetadataDatabase()
    try {
      await db.put(metadataKeys.schemaVersion, JSON.stringify(schemaVersion))
      // Update cache
      this.schemaVersion = schemaVersion
    } finally {
      db.close()
    }
  }

  async getIterator (): Promise<AsyncIterator<MessageWrapper>> {
    const db = await this.getMessageDatabase()
    return new MessageIterator(db)
  }
}
