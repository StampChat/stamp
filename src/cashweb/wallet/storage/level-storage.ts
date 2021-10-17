/* eslint-disable @typescript-eslint/no-explicit-any */
import level, { LevelDB } from 'level'
import { join } from 'path'

import { OutpointStore, OutpointResult, OutpointReturnResult } from './storage'
import { calcId } from '../helpers'
import { Outpoint, OutpointId } from 'src/cashweb/types/outpoint'

const metadataKeys = {
  schemaVersion: 'schemaVersion',
  lastServerTime: 'lastServerTime'
}

class OutpointIterator implements AsyncIterableIterator<Outpoint> {
  iterator: any;
  db: LevelDB;
  onlyFrozen: boolean

  constructor (db: LevelDB, onlyFrozen = false) {
    this.db = db
    this.onlyFrozen = onlyFrozen
  }

  async next (): Promise<IteratorResult<Outpoint>> {
    const value = await new Promise<void | Outpoint>((resolve, reject) => {
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

  [Symbol.asyncIterator] (): AsyncIterableIterator<Outpoint> {
    this.iterator = this.db.iterator({})
    return this
  }
}

const currentSchemaVersion = 1

export class LevelOutpointStore implements OutpointStore {
  private outpointDbLocation: string
  private metadataDbLocation: string
  private schemaVersion?: number
  private openedDb?: LevelDB
  private cache: Map<OutpointId, Outpoint>
  private deletedOutpoints: Set<OutpointId>

  constructor (location: string) {
    this.outpointDbLocation = join(location, 'outpoints')
    this.metadataDbLocation = join(location, 'metadata')
    this.cache = new Map<OutpointId, Outpoint>()
    this.deletedOutpoints = new Set<OutpointId>()
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

  getOutpoint (id: OutpointId): (Outpoint | undefined) {
    return this.cache.get(id)
  }

  deleteOutpoint (id: OutpointId) {
    this.cache.delete(id)
    // TODO: Handle errors here.
    this.db.del(id)
    this.deletedOutpoints.add(id)
  }

  putOutpoint (outpoint: Outpoint) {
    const index = calcId(outpoint)
    if (this.deletedOutpoints.has(index)) {
      return
    }
    this.cache.set(index, outpoint)
    this.db.put(index, JSON.stringify(outpoint))
  }

  freezeOutpoint (outpointId: OutpointId) {
    if (this.deletedOutpoints.has(outpointId)) {
      return
    }
    const outpoint = this.getOutpoint(outpointId)
    if (outpoint === undefined) {
      console.error(`trying to freeze non-existant outpoint ${outpointId}`)
      return
    }
    outpoint.frozen = true
    this.putOutpoint(outpoint)
  }

  unfreezeOutpoint (outpointId: OutpointId) {
    const outpoint = this.getOutpoint(outpointId)
    if (outpoint === undefined) {
      console.error(`trying to unfreeze non-existant outpoint ${outpointId}`)
      return
    }
    outpoint.frozen = false
    this.putOutpoint(outpoint)
  }

  private async getSchemaVersion (): Promise<number> {
    if (this.schemaVersion) {
      return this.schemaVersion
    }

    const db = this.getMetadataDatabase()
    try {
      const valueString: string = await db.get(metadataKeys.schemaVersion)
      return JSON.parse(valueString)
    } catch (err: any) {
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

  getOutpoints (): Map<string, Outpoint> {
    return this.cache
  }

  async getOutpointIterator (): Promise<AsyncIterableIterator<Outpoint>> {
    return new OutpointIterator(this.db, false)
  }

  async getFrozenOutpointIterator (): Promise<AsyncIterableIterator<Outpoint>> {
    return new OutpointIterator(this.db, true)
  }

  async loadData (): Promise<void> {
    const outpointIterator = await this.getOutpointIterator()
    for await (const outpoint of outpointIterator) {
      this.cache.set(calcId(outpoint), outpoint)
    }
  }

  /**
 * This will delete everything in the store! Don't call it by accident!
 */
  async clear () {
    await this.db.clear()
    await this.getMetadataDatabase().clear()
  }
}
