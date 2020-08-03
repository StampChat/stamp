/* eslint-disable @typescript-eslint/no-explicit-any */
import level from 'level'
import { join } from 'path'

import { OutpointStore, OutpointResult, Outpoint, OutpointReturnResult, OutpointId } from './storage'
import { calcId } from '../helpers'

const metadataKeys = {
  schemaVersion: 'schemaVersion',
  lastServerTime: 'lastServerTime'
}

class OutpointIterator implements AsyncIterator<Outpoint> {
  iterator: any;
  db: ReturnType<typeof level>;
  onlyFrozen: boolean

  constructor (db: ReturnType<typeof level>, onlyFrozen = false) {
    this.db = db
    this.onlyFrozen = onlyFrozen
  }

  async next (): Promise<IteratorResult<Outpoint>> {
    const value: Outpoint = await new Promise((resolve, reject) => {
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
        const parsedOutpoint: Outpoint = JSON.parse(value)
        resolve(parsedOutpoint)
      })
    })
    if (!value) {
      return new OutpointReturnResult()
    }
    if (!this.onlyFrozen && value.frozen) {
      return this.next()
    }
    if (this.onlyFrozen && !value.frozen) {
      return this.next()
    }

    return new OutpointResult(value)
  }

  async return (): Promise<IteratorResult<Outpoint>> {
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
    this.iterator = this.db.iterator({})
    return this
  }
}

const currentSchemaVersion = 1

export class LevelOutpointStore implements OutpointStore {
  private outpointDbLocation: string
  private metadataDbLocation: string
  private schemaVersion?: number
  private openedDb?: ReturnType<typeof level>

  constructor (location: string) {
    this.outpointDbLocation = join(location, 'outpoints')
    this.metadataDbLocation = join(location, 'metadata')
  }

  get db () {
    if (!this.openedDb) {
      throw new Error('No db opened')
    }
    return this.openedDb
  }

  async Open () {
    this.openedDb = level(this.outpointDbLocation)
    const dbSchemaVersion = await this.getSchemaVersion()
    if (!dbSchemaVersion) {
      await this.setSchemaVersion(currentSchemaVersion)
    } else if (dbSchemaVersion < currentSchemaVersion) {
      console.warn('Outdated DB, may need migration')
    } else if (dbSchemaVersion > currentSchemaVersion) {
      console.warn('Newer DB found. Client downgraded?')
    }
  }

  async Close () {
    this.db.close()
  }

  private getMetadataDatabase () {
    return level(this.metadataDbLocation)
  }

  async getOutpoint (id: OutpointId): Promise<Outpoint | undefined> {
    try {
      const value = await this.db.get(id)
      return JSON.parse(value)
    } catch (err) {
      if (err.type === 'NotFoundError') {
        return
      }
      throw err
    }
  }

  async deleteOutpoint (id: OutpointId) {
    await this.db.del(id)
  }

  async putOutpoint (outpoint: Outpoint) {
    const index = calcId(outpoint)
    await this.db.put(index, JSON.stringify(outpoint))
  }

  async freezeOutpoint (outpointId: OutpointId) {
    const outpoint = await this.getOutpoint(outpointId)
    if (outpoint === undefined) {
      throw Error('missing key')
    }
    outpoint.frozen = true
    await this.putOutpoint(outpoint)
  }

  async unfreezeOutpoint (outpointId: OutpointId) {
    const outpoint = await this.getOutpoint(outpointId)
    if (outpoint === undefined) {
      throw Error('missing key')
    }
    outpoint.frozen = false
    await this.putOutpoint(outpoint)
  }

  private async getSchemaVersion (): Promise<number> {
    if (this.schemaVersion) {
      return this.schemaVersion
    }

    const db = this.getMetadataDatabase()
    try {
      const valueString: string = await db.get(metadataKeys.schemaVersion)
      return JSON.parse(valueString)
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
    const db = this.getMetadataDatabase()
    try {
      await db.put(metadataKeys.schemaVersion, JSON.stringify(schemaVersion))
      // Update cache
      this.schemaVersion = schemaVersion
    } finally {
      db.close()
    }
  }

  async getOutpointIterator (): Promise<AsyncIterator<Outpoint>> {
    return new OutpointIterator(this.db, false)
  }

  async getFrozenOutpointIterator (): Promise<AsyncIterator<Outpoint>> {
    return new OutpointIterator(this.db, true)
  }
}
